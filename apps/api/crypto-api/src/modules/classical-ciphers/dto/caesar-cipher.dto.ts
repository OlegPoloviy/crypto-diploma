import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CaesarCipherDto {
  @ApiProperty({
    example: 'hello world',
    description: 'Plain text encrypted word-by-word for intermediate states',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: 3,
    description:
      'Alphabet shift. Negative values decrypt in the opposite direction',
  })
  @IsInt()
  @Min(-1000)
  @Max(1000)
  shift: number;
}
