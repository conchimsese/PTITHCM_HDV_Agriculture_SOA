import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { selectedPlotKey } from '../demo';
import {
  seasonStatusLabels,
  usePlotSeasons,
  usePlots,
  useSaveFarming,
  useSeasonReport,
  workTypeLabels,
} from '../api/farmingApi';
import { formatArea, formatYield } from '../../../shared/utils/formatters';
import './farming.css';

type Page = 'plots' | 'journal' | 'costs';

export function LiveFarmingPage({ page, accountId }: { page: Page; accountId: string }) {
  const [plotId, selectPlot] = useState(() => sessionStorage.getItem(selectedPlotKey) ?? '');
  const [seasonId, selectSeason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const plots = usePlots(accountId, true);
  const plot = plots.data?.items.find((item) => item.plotId === plotId) ?? plots.data?.items[0];
  const seasons = usePlotSeasons(accountId, plot?.plotId, Boolean(plot));
  const season =
    seasons.data?.items.find((item) => item.cropSeasonId === seasonId) ?? seasons.data?.items[0];
  const report = useSeasonReport(
    accountId,
    season?.cropSeasonId,
    Boolean(season && page !== 'plots'),
  );
  const save = useSaveFarming(accountId);

  const title =
    page === 'plots'
      ? 'Ruộng và mùa vụ'
      : page === 'journal'
        ? 'Nhật ký canh tác'
        : 'Chi phí canh tác';
  const subtitle =
    page === 'plots'
      ? 'Quản lý thửa ruộng, thông số tọa độ và các mùa vụ sản xuất thực tế.'
      : page === 'journal'
        ? 'Theo dõi các đợt làm đất, gieo sạ, bón phân và thu hoạch theo từng mùa vụ.'
        : 'Ghi nhận chi phí vật tư, nhân công và xem tổng chi theo mùa vụ.';

  const seasonPath = '/api/v1/crop-seasons/' + season?.cropSeasonId;
  const errors = [plots.error, seasons.error, report.error, save.error].filter(Boolean);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="farm-page">
      <header className="farm-heading">
        <div>
          <p className="farm-kicker">CANH TÁC · MÁY CHỦ THỰC</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {plot && season && (
          <Link
            className="farm-primary-link"
            to={
              '/bai-dang/tao-moi?' +
              new URLSearchParams({ plotId: plot.plotId, cropSeasonId: season.cropSeasonId })
            }
          >
            Đăng bán lúa từ mùa vụ này →
          </Link>
        )}
      </header>

      {successMsg && (
        <p className="farm-success" role="status">
          {successMsg}
        </p>
      )}
      {errors.map((error, index) => (
        <p className="farm-error" key={index} role="alert">
          {error?.message}
        </p>
      ))}
      {plots.isPending && <p role="status">Đang tải danh sách thửa ruộng…</p>}

      {plots.data?.items.length ? (
        <section className="farm-card farm-selector">
          <label>
            Ruộng đang theo dõi ({plots.data.items.length})
            <select
              value={plot?.plotId ?? ''}
              onChange={(event) => {
                sessionStorage.setItem(selectedPlotKey, event.target.value);
                selectPlot(event.target.value);
                selectSeason('');
                setSuccessMsg('');
              }}
            >
              {plots.data.items.map((item) => (
                <option key={item.plotId} value={item.plotId}>
                  {item.name} · {item.location}
                </option>
              ))}
            </select>
            {plot && (
              <small className="tabular-nums">
                {[plot.area ? `Diện tích ${formatArea(Number(plot.area))}` : null, plot.location]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            )}
          </label>
          <label>
            Mùa vụ ({seasons.data?.items.length ?? 0})
            <select
              value={season?.cropSeasonId ?? ''}
              onChange={(event) => {
                selectSeason(event.target.value);
                setSuccessMsg('');
              }}
            >
              {!season && (
                <option value="">{seasons.isFetching ? 'Đang tải…' : 'Chưa có mùa vụ'}</option>
              )}
              {seasons.data?.items.map((item) => (
                <option key={item.cropSeasonId} value={item.cropSeasonId}>
                  {item.seasonName} ({item.cropType})
                </option>
              ))}
            </select>
            {season && (
              <small>
                {[
                  `Giống ${season.cropType}`,
                  season.expectedYield != null
                    ? `Dự kiến ${formatYield(Number(season.expectedYield))}`
                    : null,
                  season.status ? (seasonStatusLabels[season.status] ?? season.status) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </small>
            )}
          </label>
        </section>
      ) : (
        !plots.isPending && (
          <section className="farm-card farm-empty-state">
            <h2>Chưa có thửa ruộng nào</h2>
            <p>
              Hãy thêm thửa ruộng đầu tiên bên dưới để bắt đầu tạo mùa vụ, ghi nhật ký và đăng bán
              lúa.
            </p>
          </section>
        )
      )}

      {page === 'plots' ? (
        <>
          {plots.data?.items.length ? (
            <section className="farm-card">
              <h2>Danh sách thửa ruộng</h2>
              <ul className="farm-entries">
                {plots.data.items.map((item) => (
                  <li key={item.plotId}>
                    <div>
                      <strong>{item.name}</strong>
                      <small className="tabular-nums">
                        {item.location}
                        {item.area ? ` · ${formatArea(Number(item.area))}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className={
                        item.plotId === plot?.plotId ? 'farm-chip-btn active' : 'farm-chip-btn'
                      }
                      onClick={() => {
                        sessionStorage.setItem(selectedPlotKey, item.plotId);
                        selectPlot(item.plotId);
                        selectSeason('');
                      }}
                    >
                      {item.plotId === plot?.plotId ? 'Đang chọn' : 'Chọn ruộng'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <FarmingForm
            title="Thêm thửa ruộng mới"
            defaultOpen={!plots.data?.items.length}
            busy={save.isPending}
            submit={async (fields) => {
              await save.mutateAsync({
                path: '/api/v1/plots',
                body: {
                  name: String(fields.name ?? '').trim(),
                  area: Number(fields.area),
                  location: String(fields.location ?? '').trim(),
                  latitude: Number(fields.latitude),
                  longitude: Number(fields.longitude),
                },
              });
              setSuccessMsg('Đã thêm thửa ruộng mới.');
            }}
          >
            <label>
              Tên ruộng
              <input name="name" required maxLength={100} placeholder="Ví dụ: Ruộng Gò Công Đông" />
            </label>
            <div className="farm-form-row">
              <label>
                Diện tích (m²)
                <input
                  name="area"
                  required
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="5000"
                />
              </label>
              <label>
                Địa điểm
                <input
                  name="location"
                  required
                  maxLength={255}
                  placeholder="Xã Tân Trung, Tiền Giang"
                />
              </label>
            </div>
            <div className="farm-form-row">
              <label>
                Vĩ độ (Latitude)
                <input
                  name="latitude"
                  required
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  defaultValue="10.36"
                />
              </label>
              <label>
                Kinh độ (Longitude)
                <input
                  name="longitude"
                  required
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  defaultValue="106.67"
                />
              </label>
            </div>
          </FarmingForm>

          {plot && (
            <FarmingForm
              key={plot.plotId}
              title={`Tạo mùa vụ cho "${plot.name}"`}
              defaultOpen={!seasons.data?.items.length}
              busy={save.isPending}
              submit={async (fields) => {
                await save.mutateAsync({
                  path: '/api/v1/plots/' + encodeURIComponent(plot.plotId) + '/crop-seasons',
                  body: {
                    seasonName: String(fields.seasonName ?? '').trim(),
                    cropType: String(fields.cropType ?? '').trim(),
                    startDate: String(fields.startDate ?? ''),
                    expectedYield: Number(fields.expectedYield),
                  },
                });
                setSuccessMsg('Đã tạo mùa vụ mới.');
              }}
            >
              <div className="farm-form-row">
                <label>
                  Tên mùa vụ
                  <input
                    name="seasonName"
                    required
                    maxLength={100}
                    placeholder="Vụ Đông Xuân 2026"
                  />
                </label>
                <label>
                  Giống lúa
                  <input
                    name="cropType"
                    required
                    maxLength={100}
                    placeholder="ST25, OM18, Jasmine 85…"
                  />
                </label>
              </div>
              <div className="farm-form-row">
                <label>
                  Ngày bắt đầu
                  <input name="startDate" required type="date" defaultValue={todayIso} />
                </label>
                <label>
                  Sản lượng dự kiến (kg)
                  <input
                    name="expectedYield"
                    required
                    type="number"
                    min="0"
                    step="any"
                    placeholder="4500"
                  />
                </label>
              </div>
            </FarmingForm>
          )}
        </>
      ) : season ? (
        <>
          <FarmingForm
            key={page + season.cropSeasonId}
            title={page === 'journal' ? 'Ghi công việc mới' : 'Thêm khoản chi mới'}
            defaultOpen
            busy={save.isPending}
            submit={async (fields) => {
              if (page === 'journal') {
                await save.mutateAsync({
                  path: seasonPath + '/logs',
                  body: {
                    workType: String(fields.workType ?? 'PLANTING'),
                    workDate: String(fields.workDate ?? ''),
                    description: String(fields.description ?? '').trim() || undefined,
                  },
                });
                setSuccessMsg('Đã ghi nhật ký canh tác.');
              } else {
                await save.mutateAsync({
                  path: seasonPath + '/costs',
                  body: {
                    category: String(fields.category ?? '').trim(),
                    amount: String(fields.amount ?? '0'),
                    incurredDate: String(fields.incurredDate ?? ''),
                    description: String(fields.description ?? '').trim() || undefined,
                  },
                });
                setSuccessMsg('Đã lưu khoản chi mới.');
              }
            }}
          >
            {page === 'journal' ? (
              <div className="farm-form-row">
                <label>
                  Công việc
                  <select name="workType" defaultValue="PLANTING">
                    <option value="LAND_PREPARATION">Làm đất</option>
                    <option value="PLANTING">Gieo sạ</option>
                    <option value="FERTILIZING">Bón phân</option>
                    <option value="WATERING">Tưới nước</option>
                    <option value="PEST_CONTROL">Phòng trừ sâu bệnh</option>
                    <option value="HARVESTING">Thu hoạch</option>
                  </select>
                </label>
                <label>
                  Ngày thực hiện
                  <input name="workDate" required type="date" defaultValue={todayIso} />
                </label>
              </div>
            ) : (
              <div className="farm-form-row">
                <label>
                  Loại chi phí
                  <input
                    name="category"
                    required
                    maxLength={50}
                    placeholder="Phân bón, Giống, Thuốc…"
                  />
                </label>
                <label>
                  Số tiền (VNĐ)
                  <input
                    name="amount"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1200000"
                  />
                </label>
                <label>
                  Ngày chi
                  <input name="incurredDate" required type="date" defaultValue={todayIso} />
                </label>
              </div>
            )}
            <label>
              Ghi chú
              <textarea
                name="description"
                maxLength={2000}
                rows={2}
                placeholder="Chi tiết thực hiện hoặc vật tư đã dùng…"
              />
            </label>
          </FarmingForm>

          {report.isPending && <p role="status">Đang tải báo cáo mùa vụ…</p>}
          {report.data && (
            <section className="farm-card">
              <div className="farm-card-head">
                <h2>{page === 'journal' ? 'Công việc đã ghi' : 'Chi phí đã ghi'}</h2>
                {page === 'costs' && (
                  <strong className="farm-total-cost">
                    Tổng chi: {Number(report.data.summary.totalCost || 0).toLocaleString('vi-VN')} ₫
                  </strong>
                )}
              </div>
              {page === 'journal' ? (
                report.data.farmingLogs.length > 0 ? (
                  <ul className="farm-entries">
                    {report.data.farmingLogs.map((item) => (
                      <li key={item.logId}>
                        <div>
                          <strong>
                            {item.description || workTypeLabels[item.workType] || item.workType}
                          </strong>
                          <small>{workTypeLabels[item.workType] ?? item.workType}</small>
                        </div>
                        <time>{item.workDate}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có công việc nào được ghi nhận cho mùa vụ này.</p>
                )
              ) : report.data.costs.length > 0 ? (
                <ul className="farm-entries">
                  {report.data.costs.map((item) => (
                    <li key={item.costId}>
                      <div>
                        <strong>{item.category}</strong>
                        <small>{item.description || item.incurredDate}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong>{Number(item.amount).toLocaleString('vi-VN')} ₫</strong>
                        <small>{item.incurredDate}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có khoản chi nào cho mùa vụ này.</p>
              )}
            </section>
          )}
        </>
      ) : (
        <section className="farm-card farm-empty-state">
          <h2>Chưa chọn hoặc chưa có mùa vụ</h2>
          <p>Bạn cần ít nhất một thửa ruộng và mùa vụ trước khi ghi nhật ký hoặc chi phí.</p>
          <div className="farm-links">
            <Link className="farm-primary-link" to="/ruong-vu">
              Đến trang Ruộng và mùa vụ →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function FarmingForm({
  title,
  busy,
  defaultOpen = false,
  submit,
  children,
}: {
  title: string;
  busy: boolean;
  defaultOpen?: boolean;
  submit: (body: Record<string, FormDataEntryValue>) => Promise<unknown>;
  children: ReactNode;
}) {
  return (
    <details className="farm-card farm-details" open={defaultOpen}>
      <summary>{title}</summary>
      <form
        className="farm-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          try {
            await submit(Object.fromEntries(new FormData(form)));
            form.reset();
          } catch {
            /* Error alert rendered above. */
          }
        }}
      >
        {children}
        <button className="farm-primary" disabled={busy}>
          {busy ? 'Đang lưu…' : title}
        </button>
      </form>
    </details>
  );
}
