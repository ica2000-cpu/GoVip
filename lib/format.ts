export function formatMoney(amount: number) {
  // Manual format to ensure server/client match regardless of locale
  return '$ ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDate(dateStr: string, includeWeekday: boolean = false) {
  if (!dateStr) return 'Próximamente';
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0]);
  const monthIndex = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  
  // Create date safely using local components to get weekday
  const date = new Date(year, monthIndex, day);
  const weekday = weekdays[date.getDay()];
  
  if (includeWeekday) {
    return `${weekday} ${day} de ${months[monthIndex]}`;
  }
  
  // Short format: "15 oct"
  return `${day} ${months[monthIndex].substring(0, 3)}`;
}
