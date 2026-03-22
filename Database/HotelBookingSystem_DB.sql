 -- to reset the connections
 FLUSH USER_RESOURCES;
  -- ============================

 
 -- ============================
 -- Create Database
 -- ============================
 DROP DATABASE IF EXISTS HotelBookingSystem_DB;
 CREATE DATABASE IF NOT EXISTS HotelBookingSystem_DB
   CHARACTER SET utf8mb4
   COLLATE utf8mb4_general_ci;
   
 -- ============================
 -- Use Database
 -- ============================
 USE HotelBookingSystem_DB;
 -- ============================
 -- Create User Table
 -- ============================
 CREATE TABLE users (
   id INT AUTO_INCREMENT PRIMARY KEY,       -- user ID
   username VARCHAR(30) UNIQUE NOT NULL,               -- user's username
   userPassword VARCHAR(60) NOT NULL,			-- Store user's hash password
   -- user's password (VARCHAR(60) because bcypt is fixed the legnth at 60 characters.)
   roles ENUM('USER', 'ADMIN') DEFAULT 'USER'
 );
 CREATE TABLE rooms (
   id INT AUTO_INCREMENT PRIMARY KEY,       -- Room ID
   name VARCHAR(100) NOT NULL,               -- Room name or number
   description TEXT,                         -- Room description
   capacity INT NOT NULL,                    -- Maximum guests
   price_per_night DECIMAL(10,2) NOT NULL,   -- Price per night
   image_url VARCHAR(255),                   -- Image URL or path
   is_active BOOLEAN DEFAULT TRUE,            -- Availability status
 
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
     ON UPDATE CURRENT_TIMESTAMP
 );
 
 -- ============================
 -- Insert Sample user (Optional)userid
 -- ============================
 INSERT INTO users (id, username, userPassword, roles) VALUES
 (1, 'ADMIN', '$2a$12$SLk/Wnc/JBRnvsiAT5vAl.r3Y/St1DvvGco3SXP.WtxDYb4vZtyFS', 'ADMIN'), -- Admin Password: ADMIN_Pass123
 (2, 'Tester1', '$2a$12$7ywt.sJ6c9idMhLRSGogjuTLsZHL.L518c5WqInfMjQUmEc/2/TRS', 'USER'); -- Tester1 Password: Tester123456

 -- ============================
 -- Insert Sample rooms
 -- ============================
 INSERT INTO rooms (name, description, capacity, price_per_night, image_url, is_active) VALUES
 ('Standard Room 101', 'Standard room with garden view', 2, 1800.00, '/images/room101.jpg', TRUE);
 SELECT * FROM users;
 SELECT * FROM rooms;