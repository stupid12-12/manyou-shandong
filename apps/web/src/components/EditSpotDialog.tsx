import { X, Trash2 } from 'lucide-react';
import type { Spot } from '@manyou/shared';
import { useState, useEffect } from 'react';

interface EditSpotDialogProps {
  spot: Spot | null;
  isOpen: boolean;
  mode: 'create' | 'edit';
  onSave: (spot: Spot) => void;
  onDelete?: (spotId: string) => void;
  onClose: () => void;
}

export function EditSpotDialog({ spot, isOpen, mode, onSave, onDelete, onClose }: EditSpotDialogProps) {
  const [formData, setFormData] = useState<Partial<Spot>>(spot ?? {});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && spot) {
      setFormData({ ...spot });
      setError('');
    }
  }, [isOpen, spot]);

  const handleSave = () => {
    const name = formData.name?.trim();
    if (!formData.id || !name || !formData.cityId) {
      setError('请填写景点名称');
      return;
    }
    onSave({
      ...formData,
      name,
      shortName: formData.shortName?.trim() || name.slice(0, 4),
      recommendedTime: formData.recommendedTime?.trim() || '时间待定',
      duration: formData.duration?.trim() || '时长待定',
      price: formData.price?.trim() || '待定',
      transport: formData.transport?.trim() || '待定',
      description: formData.description?.trim() || '暂无景点介绍'
    } as Spot);
    onClose();
  };

  const handleDelete = () => {
    if (!spot || !onDelete) return;
    if (confirm('确认删除此景点？')) {
      onDelete(spot.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-dialog-overlay" onClick={onClose}>
      <div className="edit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="edit-dialog-header">
          <h3>{mode === 'create' ? '添加景点' : '编辑景点'}</h3>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="edit-dialog-content">
          <div className="form-group">
            <label>景点名称 *</label>
            <input
              type="text"
              value={formData.name ?? ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：中山路与里院"
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="form-row">
            <div className="form-group">
              <label>简称</label>
              <input
                type="text"
                value={formData.shortName ?? ''}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="如：老城"
              />
            </div>
            <div className="form-group">
              <label>类别</label>
              <select
                value={formData.category ?? 'sight'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              >
                <option value="sight">景点</option>
                <option value="food">美食</option>
                <option value="transport">交通</option>
                <option value="experience">体验</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>顺序号</label>
              <input
                type="number"
                value={formData.order ?? 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="按景点顺序编号，用于自动连线"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>所属日期</label>
              <input
                type="number"
                value={formData.day ?? 1}
                onChange={(e) => setFormData({ ...formData, day: parseInt(e.target.value) || 1 })}
                placeholder="如：1 表示第1天"
                min="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="景点的简要介绍"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>推荐时间</label>
              <input
                type="text"
                value={formData.recommendedTime ?? ''}
                onChange={(e) => setFormData({ ...formData, recommendedTime: e.target.value })}
                placeholder="如：D1 · 17:30—20:00"
              />
            </div>
            <div className="form-group">
              <label>花费时间</label>
              <input
                type="text"
                value={formData.duration ?? ''}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="如：2.5小时"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>门票/价格</label>
              <input
                type="text"
                value={formData.price ?? ''}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="如：免费"
              />
            </div>
            <div className="form-group">
              <label>交通方式</label>
              <input
                type="text"
                value={formData.transport ?? ''}
                onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                placeholder="如：地铁3号线"
              />
            </div>
          </div>

          <div className="form-group">
            <label>景点亮点（每行一个）</label>
            <textarea
              value={(formData.highlights ?? []).join('\n')}
              onChange={(e) => setFormData({ ...formData, highlights: e.target.value.split('\n').filter(Boolean) })}
              placeholder="天主教堂外观&#10;银鱼巷&#10;里院建筑"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>美食推荐（每行一个）</label>
            <textarea
              value={(formData.foods ?? []).join('\n')}
              onChange={(e) => setFormData({ ...formData, foods: e.target.value.split('\n').filter(Boolean) })}
              placeholder="排骨米饭&#10;锅贴"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>省钱提示（每行一个）</label>
            <textarea
              value={(formData.savingTips ?? []).join('\n')}
              onChange={(e) => setFormData({ ...formData, savingTips: e.target.value.split('\n').filter(Boolean) })}
              placeholder="教堂只看外观即可"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>安全提醒（每行一个）</label>
            <textarea
              value={(formData.safetyNotices ?? []).join('\n')}
              onChange={(e) => setFormData({ ...formData, safetyNotices: e.target.value.split('\n').filter(Boolean) })}
              placeholder="礁石湿滑"
              rows={2}
            />
          </div>
        </div>

        <div className="edit-dialog-footer">
          {mode === 'edit' && onDelete && (
            <button className="delete-btn" onClick={handleDelete}>
              <Trash2 size={16} />
              删除
            </button>
          )}
          <div className="action-buttons">
            <button className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button className="btn-save" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
