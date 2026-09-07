export class UserResponseDto {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class UserProfileResponseDto {
  id!: string;
  email!: string;
  displayName!: string | null;
  avatarUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
