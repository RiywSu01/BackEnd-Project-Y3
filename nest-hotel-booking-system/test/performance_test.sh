#!/bin/bash
# =============================================================================
# Hotel Booking System — Performance & Rate Limit Test
# Usage: bash performance_test.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000
# Requirements: curl (pre-installed on macOS)
# =============================================================================

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}${BOLD}  $1${NC}"
  echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_pass() { echo -e "  ${GREEN}✔ PASS${NC}  $1"; ((PASS++)); }
print_fail() { echo -e "  ${RED}✘ FAIL${NC}  $1"; ((FAIL++)); }
print_info() { echo -e "  ${YELLOW}ℹ${NC}  $1"; }

# Check server is up
echo ""
echo -e "${BOLD}Checking server at ${BASE_URL}...${NC}"
if ! curl -sf "${BASE_URL}/api/health" > /dev/null 2>&1; then
  echo -e "${RED}ERROR: Server not reachable at ${BASE_URL}. Start it with: npm run start${NC}"
  exit 1
fi
echo -e "${GREEN}Server is up!${NC}"

# =============================================================================
# TEST 1: CACHE PERFORMANCE — GET /api/rooms
# =============================================================================
print_header "TEST 1: Cache Performance — GET /api/rooms"

print_info "Sending 1 cold request to warm the cache..."
curl -s -o /dev/null "${BASE_URL}/api/rooms"
sleep 0.1

TOTAL_MS=0
REQUESTS=10

print_info "Sending ${REQUESTS} warm requests (should be served from cache)..."
for i in $(seq 1 $REQUESTS); do
  ELAPSED=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/api/rooms")
  MS=$(echo "$ELAPSED * 1000" | bc | cut -d. -f1)
  TOTAL_MS=$((TOTAL_MS + MS))
done

AVG_MS=$((TOTAL_MS / REQUESTS))
print_info "Average response time over ${REQUESTS} warm requests: ${AVG_MS}ms"

if [ "$AVG_MS" -lt 100 ]; then
  print_pass "Cache is effective — avg ${AVG_MS}ms (under 100ms threshold)"
else
  print_fail "Cache may not be working — avg ${AVG_MS}ms (over 100ms threshold)"
fi

# =============================================================================
# TEST 2: CACHE PERFORMANCE — GET /api/rooms/:id
# =============================================================================
print_header "TEST 2: Cache Performance — GET /api/rooms/1"

curl -s -o /dev/null "${BASE_URL}/api/rooms/1"
sleep 0.1

TOTAL_MS=0
for i in $(seq 1 $REQUESTS); do
  ELAPSED=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/api/rooms/1")
  MS=$(echo "$ELAPSED * 1000" | bc | cut -d. -f1)
  TOTAL_MS=$((TOTAL_MS + MS))
done

AVG_MS=$((TOTAL_MS / REQUESTS))
print_info "Average response time over ${REQUESTS} warm requests: ${AVG_MS}ms"

if [ "$AVG_MS" -lt 100 ]; then
  print_pass "Cache is effective — avg ${AVG_MS}ms (under 100ms threshold)"
else
  print_fail "Cache may not be working — avg ${AVG_MS}ms (over 100ms threshold)"
fi

# =============================================================================
# TEST 3: RATE LIMITING — Global (60 req/60s on GET /api/rooms)
# =============================================================================
print_header "TEST 3: Global Rate Limiting — GET /api/rooms (limit: 60/60s)"

print_info "Sending 65 rapid requests to GET /api/rooms..."
COUNT_429=0
COUNT_200=0

for i in $(seq 1 65); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/rooms")
  if [ "$STATUS" = "429" ]; then
    ((COUNT_429++))
  elif [ "$STATUS" = "200" ]; then
    ((COUNT_200++))
  fi
done

print_info "200 OK responses: ${COUNT_200}"
print_info "429 Too Many Requests: ${COUNT_429}"

if [ "$COUNT_429" -gt 0 ]; then
  print_pass "Rate limiting is active — got ${COUNT_429} × 429 responses after limit exceeded"
else
  print_fail "No 429 responses received — rate limiting may not be applied"
fi

# =============================================================================
# TEST 4: STRICT RATE LIMITING — POST /api/auth/login (limit: 10/60s)
# =============================================================================
print_header "TEST 4: Strict Rate Limiting — POST /api/auth/login (limit: 10/60s)"

print_info "Sending 15 rapid login requests..."
COUNT_429=0
COUNT_OTHER=0

for i in $(seq 1 15); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpass"}')
  if [ "$STATUS" = "429" ]; then
    ((COUNT_429++))
  else
    ((COUNT_OTHER++))
  fi
done

print_info "Non-429 responses (200/400/401/etc): ${COUNT_OTHER}"
print_info "429 Too Many Requests: ${COUNT_429}"

if [ "$COUNT_429" -gt 0 ]; then
  print_pass "Strict rate limiting on /api/auth/login is active — got ${COUNT_429} × 429 responses"
else
  print_fail "No 429 on /api/auth/login — strict rate limiting may not be working"
fi

# =============================================================================
# TEST 5: HEALTH CHECK — should always respond (no rate limit)
# =============================================================================
print_header "TEST 5: Health Check — @SkipThrottle() (no rate limit)"

print_info "Sending 20 rapid health check requests..."
ALL_OK=true
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
  if [ "$STATUS" = "429" ]; then
    ALL_OK=false
    break
  fi
done

if [ "$ALL_OK" = true ]; then
  print_pass "Health check has no rate limit — all 20 requests succeeded"
else
  print_fail "Health check returned 429 — @SkipThrottle() may not be working"
fi

# =============================================================================
# SUMMARY
# =============================================================================
print_header "SUMMARY"
TOTAL=$((PASS + FAIL))
echo -e "  Tests run:    ${TOTAL}"
echo -e "  ${GREEN}Passed: ${PASS}${NC}"
echo -e "  ${RED}Failed: ${FAIL}${NC}"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  All tests passed! Caching & rate limiting are working correctly.${NC}"
else
  echo -e "${YELLOW}${BOLD}  Some tests failed. Check the output above for details.${NC}"
fi
echo ""
