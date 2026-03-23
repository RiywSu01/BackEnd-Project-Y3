import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService, 
  ) {}
  
  //User Get Own Profile (For User to see their own profile)
  async GetProfile(username: string) {
    try{
      const user = await this.prisma.users.findUnique( {where: {username}} );
      if(!user){ //If user didnt exist
        throw new NotFoundException(`User name: ${username}, not found.`);
      }
      const {roles ,userPassword, ...Information} = user; // To extract the crucial information out.
      return {message: `Successfully retrive ${user.username} profile.`, data: Information};
    }catch(error){
      throw new InternalServerErrorException("Something went wrong while retrive the profile.");
    }

  }

  //User Update Own Profile (For User to see thier own Profile)
  async UpdateProfile(username: string, updateUserDto: UpdateUserDto) {
    try{
      const user = await this.prisma.users.findUnique({where:{username}});
      //If user not found
      if(!user){
        throw new BadRequestException(`User ${username} not found.`);
      }
      //Check if the username already have or not
      if(updateUserDto.username === user.username){
        throw new ConflictException(`This username have been already used.`);
      }

     //Check if the username already have or not
      if(updateUserDto.email === user.email){
        throw new ConflictException(`This email have been already used.`);
      }

      const result = await this.prisma.users.update({
        where: { username },
        // Prisma will only update the fields that are actually inside this DTO
        data: updateUserDto, 
      });

      return {message:`Profile username:${username} has been updated successfully.`, data: result};
    }catch(error){
      throw new InternalServerErrorException("Something went wrong while updating the profile.");
    }
  



    
  }

  //User Update their own password (For User to changed their password)
  async changePassword(username: string, dto: ChangePasswordDto){
    try{
      //1.Find user first
      const user = await this.prisma.users.findUnique( {where:{username}});
      //If user not found
      if(!user){
        throw new BadRequestException(`User ${username} not found.`);
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
      this.prisma.users.update({
        where: {username},
        data: {userPassword: hashedPassword}
      });
      return {message:'Password have been changed successfully.'};

    }catch(error){
      throw new InternalServerErrorException("Something went wrong while changing password.");
    }
  }


}
