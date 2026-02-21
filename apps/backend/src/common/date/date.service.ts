import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

@Injectable()
export class DateService {
  now() {
    return dayjs().tz('America/Sao_Paulo').toDate();
  }

  format(date: Date, formatStr = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]') {
    return dayjs(date).tz('America/Sao_Paulo').format(formatStr);
  }

  formatRelative(date: Date): string {
    const now = dayjs().tz('America/Sao_Paulo');
    const target = dayjs(date).tz('America/Sao_Paulo');
    const diffHours = now.diff(target, 'hour');
    const diffDays = now.diff(target, 'day');

    if (diffHours < 1) {
      const diffMinutes = now.diff(target, 'minute');
      if (diffMinutes < 1) return 'Agora mesmo';
      return `Há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    }
    
    if (diffHours < 24) {
      return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    }
    
    if (diffDays === 1) {
      return 'Ontem';
    }
    
    if (diffDays < 7) {
      return `Há ${diffDays} dias`;
    }
    
    return target.format('DD/MM/YYYY');
  }
}
