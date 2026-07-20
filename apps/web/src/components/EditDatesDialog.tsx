import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Save, X } from 'lucide-react';
import type { City } from '@manyou/shared';

interface EditDatesDialogProps {
  city: City;
  isOpen: boolean;
  onSave: (dateRange: string, dayDates: Record<string, string>, days: number[]) => void;
  onClose: () => void;
}

function expandDateRange(value: string): string[] | null {
  const match = value.trim().match(/^(\d{1,2})[.\/-](\d{1,2})\s*[—–~-]\s*(\d{1,2})[.\/-](\d{1,2})$/);
  if (!match) return null;
  const [, startMonthText, startDayText, endMonthText, endDayText] = match;
  const startMonth = Number(startMonthText);
  const startDay = Number(startDayText);
  const endMonth = Number(endMonthText);
  const endDay = Number(endDayText);
  const start = new Date(Date.UTC(2026, startMonth - 1, startDay));
  let end = new Date(Date.UTC(2026, endMonth - 1, endDay));
  if (start.getUTCMonth() !== startMonth - 1 || start.getUTCDate() !== startDay || end.getUTCMonth() !== endMonth - 1 || end.getUTCDate() !== endDay) return null;
  if (end < start) end = new Date(Date.UTC(2027, endMonth - 1, endDay));
  const result: string[] = [];
  for (let cursor = new Date(start); cursor <= end && result.length < 31; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(`${String(cursor.getUTCMonth() + 1).padStart(2, '0')}.${String(cursor.getUTCDate()).padStart(2, '0')}`);
  }
  return result.length > 0 && result.length <= 30 ? result : null;
}

export function EditDatesDialog({ city, isOpen, onSave, onClose }: EditDatesDialogProps) {
  const [dateRange, setDateRange] = useState(city.dates);
  const [error, setError] = useState('');
  const expandedDates = useMemo(() => expandDateRange(dateRange), [dateRange]);
  const startDay = city.days[0] ?? 1;

  useEffect(() => {
    if (!isOpen) return;
    setDateRange(city.dates);
    setError('');
  }, [city.dates, isOpen]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!expandedDates) {
      setError('请输入有效日期范围，例如 07.31—08.04');
      return;
    }
    const days = expandedDates.map((_, index) => startDay + index);
    onSave(dateRange.trim(), Object.fromEntries(days.map((day, index) => [day, expandedDates[index]!])), days);
    onClose();
  }

  if (!isOpen) return null;

  return <div className="edit-dialog-overlay" onClick={onClose}>
    <form className="edit-dialog date-dialog" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
      <div className="edit-dialog-header">
        <h3><CalendarDays />编辑{city.name}日期</h3>
        <button className="close-btn" type="button" onClick={onClose} aria-label="关闭日期编辑"><X /></button>
      </div>
      <div className="edit-dialog-content">
        <div className="form-group">
          <label htmlFor="trip-date-range">旅行日期范围</label>
          <input id="trip-date-range" value={dateRange} onChange={(event) => setDateRange(event.target.value)} placeholder="如：07.31—08.02" />
        </div>
        {expandedDates ? <><p className="date-count">共 {expandedDates.length} 天</p><div className="day-date-fields">
          {expandedDates.map((date, index) => <div className="day-date-preview" key={`${date}-${index}`}><strong>D{startDay + index}</strong><span>{date}</span></div>)}
        </div></> : <p className="form-error" role="alert">请输入有效日期范围，例如 07.31—08.04</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <div className="edit-dialog-footer">
        <span />
        <div className="action-buttons"><button className="btn-cancel" type="button" onClick={onClose}>取消</button><button className="btn-save" type="submit"><Save />保存日期</button></div>
      </div>
    </form>
  </div>;
}
