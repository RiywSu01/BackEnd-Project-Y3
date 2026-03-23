import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService, 
  ) {}
  
  //User Get Own Profile (For User to see their own profile)
  async GetProfile(username: string) {
    const user = await this.prisma.users.findUnique( {where: {username}} );
    if(!user){ //If user didnt exist
      throw new NotFoundException(`User name: ${user}, not found.`);
    }
    const {roles ,userPassword, ...Information} = user; // To extract the crucial information out.
    return Information;
  }

  //User Update Own Profile
  async UpdateProfile(username: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.users.findUnique({where:{username}});
    if(!user){
      throw new BadRequestException("User not found.");
    }

    //Check if the username already have or not
    if(updateUserDto.username === user.username){
      throw new Error(`This username have been already used.`);
    }

     //Check if the username already have or not
     if(updateUserDto.email === user.email){
      throw new Error(`This email have been already used.`);
    }

    return await this.prisma.users.update({
      where: { username },
      // Prisma will only update the fields that are actually inside this DTO
      data: updateUserDto, 
    });
  }

  //User Update their own password
  async changePassword(username: string, dto: ChangePasswordDto){
    //1.Find user first
    const user = await this.prisma.users.findUnique( {where:{username}});
    //If user not found
    if(!user){
      throw new BadRequestException("User not found.");
    }

    //2.Verify old password first
    const IsPasswordValid = await bcrypt.compare(dto.oldPassword, user.userPassword); 
    // bcrypt.compare() - function securely verifies a user-provided plaintext password against a stored hashed password.
    //if old password didnt match with the hash pasword version in database
    if(!IsPasswordValid){
      throw new BadRequestException("Old password is incorrect, please retry again.");
    }

    //If password matched
    //3.Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    return this.prisma.users.update({
      where: {username},
      data: {userPassword: hashedPassword}
    });
  }


}
