import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getInitials(name: string){
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


export function formatDateTime(dateString: string | Date | number,format:string='DD-MM-YYYY HH:mm:ss'): string {

  const date = new Date(dateString);

  return dayjs(date).format(format);
}
