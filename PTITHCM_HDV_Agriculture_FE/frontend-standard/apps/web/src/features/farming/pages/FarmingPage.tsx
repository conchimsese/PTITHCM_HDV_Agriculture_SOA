import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../../shared/hooks/useAuth';
import './farming.css';

type Plot = { id: string; name: string; area: string; season: string; crop: string };
type Entry = {
  id: string;
  plotId: string;
  season: string;
  date: string;
  detail: string;
  amount?: number;
};
type Data = { plots: Plot[]; journal: Entry[]; costs: Entry[] };
const initial: Data = {
  plots: [
    { id: 'sample-1', name: 'Ruộng A1', area: '2.500 m²', season: 'Thu Đông 2026', crop: 'ST25' },
    { id: 'sample-2', name: 'Ruộng B2', area: '1.800 m²', season: 'Hè Thu 2026', crop: 'OM18' },
  ],
  journal: [
    {
      id: 'j1',
      plotId: 'sample-1',
      season: 'Thu Đông 2026',
      date: '2026-10-11',
      detail: 'Bón phân lần 2',
    },
  ],
  costs: [
    {
      id: 'c1',
      plotId: 'sample-1',
      season: 'Thu Đông 2026',
      date: '2026-10-11',
      detail: 'Phân bón',
      amount: 720000,
    },
  ],
};
const storageKey = 'agri-farming-demo-v1';
function load(): Data {
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Data) : initial;
  } catch {
    return initial;
  }
}

export function FarmingPage({ page }: { page: 'plots' | 'journal' | 'costs' }) {
  const session = useSession();
  const [data, setData] = useState(load);
  const [selected, setSelected] = useState(data.plots[0]?.id ?? '');
  const [formOpen, setFormOpen] = useState(false);
  const plot = data.plots.find((item) => item.id === selected);
  const entries = data[page === 'costs' ? 'costs' : 'journal'].filter(
    (item) => item.plotId === selected && item.season === plot?.season,
  );
  const save = (next: Data) => {
    setData(next);
    sessionStorage.setItem(storageKey, JSON.stringify(next));
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? '').trim();
    if (page === 'plots') {
      const item: Plot = {
        id: crypto.randomUUID(),
        name: value('name'),
        area: value('area') + ' m²',
        season: '',
        crop: '',
      };
      save({ ...data, plots: [...data.plots, item] });
      setSelected(item.id);
    } else if (plot) {
      const entry: Entry = {
        id: crypto.randomUUID(),
        plotId: plot.id,
        season: plot.season,
        date: value('date'),
        detail: value('detail'),
        ...(page === 'costs' ? { amount: Number(value('amount')) } : {}),
      };
      save({ ...data, [page]: [...data[page], entry] });
    }
    setFormOpen(false);
  }
  function addSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plot) return;
    const fields = new FormData(event.currentTarget);
    save({
      ...data,
      plots: data.plots.map((item) =>
        item.id === plot.id
          ? {
              ...item,
              season: String(fields.get('season')).trim(),
              crop: String(fields.get('crop')).trim(),
            }
          : item,
      ),
    });
    setFormOpen(false);
  }
  if (!session?.isDemo)
    return (
      <div className="farm-page">
        <h1>Ruộng và mùa vụ</h1>
        <p>Màn hình đang được chuẩn bị để kết nối dữ liệu canh tác.</p>
      </div>
    );
  return (
    <div className="farm-page">
      <p className="farm-kicker">CANH TÁC · DỮ LIỆU MẪU</p>
      <div className="farm-heading">
        <div>
          <h1>
            {page === 'plots'
              ? 'Ruộng và mùa vụ'
              : page === 'journal'
                ? 'Nhật ký canh tác'
                : 'Chi phí canh tác'}
          </h1>
          <p>Theo dõi công việc theo từng ruộng và mùa vụ của bạn.</p>
        </div>
        <button className="farm-primary" onClick={() => setFormOpen(!formOpen)}>
          {formOpen
            ? 'Đóng'
            : page === 'plots'
              ? '+ Thêm ruộng'
              : page === 'journal'
                ? '+ Ghi công việc'
                : '+ Thêm chi phí'}
        </button>
      </div>
      <p className="farm-notice">
        Dữ liệu minh họa được giữ trong phiên trình duyệt; chưa kết nối máy chủ.
      </p>
      <section className="farm-card farm-selector">
        <label>
          Ruộng đang chọn
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setFormOpen(false);
            }}
          >
            {data.plots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.area}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Mùa vụ</span>
          <strong>{plot?.season || 'Chưa có mùa vụ'}</strong>
          <small>{plot?.crop || 'Tạo mùa vụ để bắt đầu ghi chép'}</small>
        </div>
      </section>
      {formOpen &&
        (page === 'plots' ? (
          <form className="farm-card farm-form" onSubmit={submit}>
            <h2>Thêm ruộng</h2>
            <label>
              Tên ruộng
              <input name="name" required maxLength={80} />
            </label>
            <label>
              Diện tích (m²)
              <input name="area" type="number" min="1" required />
            </label>
            <button className="farm-primary">Lưu ruộng mẫu</button>
          </form>
        ) : plot?.season ? (
          <form className="farm-card farm-form" onSubmit={submit}>
            <h2>{page === 'journal' ? 'Ghi công việc' : 'Thêm chi phí'}</h2>
            <label>
              Ngày
              <input type="date" name="date" required />
            </label>
            <label>
              {page === 'journal' ? 'Nội dung công việc' : 'Khoản chi'}
              <input name="detail" required maxLength={200} />
            </label>
            {page === 'costs' && (
              <label>
                Số tiền (đồng)
                <input name="amount" type="number" min="1" required />
              </label>
            )}
            <button className="farm-primary">Lưu bản mẫu</button>
          </form>
        ) : (
          <p className="farm-notice">Hãy tạo mùa vụ trước khi ghi chép.</p>
        ))}
      {page === 'plots' ? (
        <section className="farm-card">
          <h2>Mùa vụ đang chọn</h2>
          {plot?.season ? (
            <>
              <p>
                <strong>{plot.season}</strong> · Giống lúa {plot.crop}
              </p>
              <div className="farm-links">
                <Link to="/nhat-ky">Xem nhật ký →</Link>
                <Link to="/chi-phi">Xem chi phí →</Link>
                <Link to="/bai-dang">Bài đăng bán lúa →</Link>
              </div>
            </>
          ) : (
            <>
              <p>Ruộng này chưa có mùa vụ.</p>
              <form className="farm-form" onSubmit={addSeason}>
                <label>
                  Tên mùa vụ
                  <input name="season" required maxLength={80} />
                </label>
                <label>
                  Giống lúa
                  <input name="crop" required maxLength={80} />
                </label>
                <button className="farm-primary">Tạo mùa vụ mẫu</button>
              </form>
            </>
          )}
        </section>
      ) : (
        <section className="farm-card">
          <div className="farm-heading">
            <h2>{page === 'journal' ? 'Công việc đã ghi' : 'Các khoản chi'}</h2>
            {page === 'costs' && (
              <strong>
                {entries.reduce((sum, item) => sum + (item.amount ?? 0), 0).toLocaleString('vi-VN')}{' '}
                đ
              </strong>
            )}
          </div>
          {entries.length ? (
            <ul className="farm-entries">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{entry.detail}</strong>
                    <small>
                      {entry.date} · {entry.season}
                    </small>
                  </div>
                  {entry.amount !== undefined && (
                    <strong>{entry.amount.toLocaleString('vi-VN')} đ</strong>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có dữ liệu cho mùa vụ này.</p>
          )}
        </section>
      )}
    </div>
  );
}
