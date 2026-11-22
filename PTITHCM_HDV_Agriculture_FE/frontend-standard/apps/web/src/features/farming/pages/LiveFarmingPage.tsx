import type { ReactNode } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { http } from '../../../shared/api/runtime';
import './farming.css';

type Plot = { plotId: string; name: string; location: string };
type Season = { cropSeasonId: string; seasonName: string; cropType: string };
type Report = {
  farmingLogs: { logId: string; workDate: string; description: string; workType: string }[];
  costs: { costId: string; incurredDate: string; category: string; amount: string }[];
  summary: { totalCost: number };
};
type Page = 'plots' | 'journal' | 'costs';

export function LiveFarmingPage({ page, accountId }: { page: Page; accountId: string }) {
  const cache = useQueryClient();
  const prefix = ['farming', accountId];
  const [plotId, selectPlot] = useState('');
  const [seasonId, selectSeason] = useState('');
  const plots = useQuery({
    queryKey: [...prefix, 'plots'],
    queryFn: ({ signal }) => http.request<{ items: Plot[] }>('/api/v1/plots?size=100', { signal }),
  });
  const plot = plots.data?.items.find((item) => item.plotId === plotId) ?? plots.data?.items[0];
  const seasons = useQuery({
    queryKey: [...prefix, 'seasons', plot?.plotId],
    enabled: !!plot,
    queryFn: ({ signal }) =>
      http.request<{ items: Season[] }>('/api/v1/plots/' + plot?.plotId + '/crop-seasons', {
        signal,
      }),
  });
  const season =
    seasons.data?.items.find((item) => item.cropSeasonId === seasonId) ?? seasons.data?.items[0];
  const report = useQuery({
    queryKey: [...prefix, 'report', season?.cropSeasonId],
    enabled: !!season && page !== 'plots',
    queryFn: ({ signal }) =>
      http.request<Report>('/api/v1/crop-seasons/' + season?.cropSeasonId + '/report', { signal }),
  });
  const save = useMutation({
    mutationFn: ({ path, body }: { path: string; body: Record<string, FormDataEntryValue> }) =>
      http.request(path, { method: 'POST', body }),
    onSuccess: () => cache.invalidateQueries({ queryKey: prefix }),
  });
  const title =
    page === 'plots'
      ? 'Ruộng và mùa vụ'
      : page === 'journal'
        ? 'Nhật ký canh tác'
        : 'Chi phí canh tác';
  const seasonPath = '/api/v1/crop-seasons/' + season?.cropSeasonId;
  const errors = [plots.error, seasons.error, report.error, save.error].filter(Boolean);
  return (
    <div className="farm-page">
      <h1>{title}</h1>
      {errors.map((error, index) => (
        <p key={index} role="alert">
          {error?.message}
        </p>
      ))}
      {plots.isFetching && <p role="status">Đang tải ruộng…</p>}
      {plots.data?.items.length ? (
        <section className="farm-card farm-selector">
          <label>
            Ruộng
            <select
              value={plot?.plotId}
              onChange={(event) => {
                selectPlot(event.target.value);
                selectSeason('');
              }}
            >
              {plots.data.items.map((item) => (
                <option key={item.plotId} value={item.plotId}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mùa vụ
            <select
              value={season?.cropSeasonId ?? ''}
              onChange={(event) => selectSeason(event.target.value)}
            >
              {!season && (
                <option value="">{seasons.isFetching ? 'Đang tải…' : 'Chưa có mùa vụ'}</option>
              )}
              {seasons.data?.items.map((item) => (
                <option key={item.cropSeasonId} value={item.cropSeasonId}>
                  {item.seasonName}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}
      {page === 'plots' ? (
        <>
          <FarmingForm
            title="Thêm ruộng"
            busy={save.isPending}
            submit={(body) => save.mutateAsync({ path: '/api/v1/plots', body })}
          >
            <label>
              Tên ruộng
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Diện tích (m²)
              <input name="area" required type="number" min="0.01" step="any" />
            </label>
            <label>
              Địa điểm
              <input name="location" required maxLength={255} />
            </label>
            <label>
              Vĩ độ
              <input name="latitude" required type="number" min="-90" max="90" step="any" />
            </label>
            <label>
              Kinh độ
              <input name="longitude" required type="number" min="-180" max="180" step="any" />
            </label>
          </FarmingForm>
          {plot && (
            <FarmingForm
              key={plot.plotId}
              title="Tạo mùa vụ"
              busy={save.isPending}
              submit={(body) =>
                save.mutateAsync({ path: '/api/v1/plots/' + plot.plotId + '/crop-seasons', body })
              }
            >
              <label>
                Tên mùa vụ
                <input name="seasonName" required maxLength={100} />
              </label>
              <label>
                Giống lúa
                <input name="cropType" required maxLength={100} />
              </label>
              <label>
                Ngày bắt đầu
                <input name="startDate" required type="date" />
              </label>
              <label>
                Sản lượng dự kiến (kg)
                <input name="expectedYield" required type="number" min="0" step="any" />
              </label>
            </FarmingForm>
          )}
          {plot && season && (
            <p>
              <Link
                to={
                  '/bai-dang/tao-moi?' +
                  new URLSearchParams({ plotId: plot.plotId, cropSeasonId: season.cropSeasonId })
                }
              >
                Đăng bán lúa từ mùa vụ này →
              </Link>
            </p>
          )}
        </>
      ) : season ? (
        <>
          <FarmingForm
            key={page + season.cropSeasonId}
            title={page === 'journal' ? 'Ghi công việc' : 'Thêm khoản chi'}
            busy={save.isPending}
            submit={(body) =>
              save.mutateAsync({
                path: seasonPath + (page === 'journal' ? '/logs' : '/costs'),
                body,
              })
            }
          >
            {page === 'journal' ? (
              <>
                <label>
                  Công việc
                  <select name="workType">
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
                  <input name="workDate" required type="date" />
                </label>
              </>
            ) : (
              <>
                <label>
                  Loại chi phí
                  <input name="category" required maxLength={50} />
                </label>
                <label>
                  Số tiền
                  <input name="amount" required type="number" min="0" step="0.01" />
                </label>
                <label>
                  Ngày chi
                  <input name="incurredDate" required type="date" />
                </label>
              </>
            )}
            <label>
              Ghi chú
              <textarea name="description" maxLength={2000} />
            </label>
          </FarmingForm>
          {report.isFetching && <p role="status">Đang tải báo cáo…</p>}
          {report.data && (
            <section className="farm-card">
              <h2>{page === 'journal' ? 'Công việc đã ghi' : 'Chi phí đã ghi'}</h2>
              {page === 'journal' ? (
                report.data.farmingLogs.map((item) => (
                  <p key={item.logId}>
                    {item.workDate} · {item.description || item.workType}
                  </p>
                ))
              ) : (
                <>
                  <strong>{report.data.summary.totalCost.toLocaleString('vi-VN')} ₫</strong>
                  {report.data.costs.map((item) => (
                    <p key={item.costId}>
                      {item.incurredDate} · {item.category} ·{' '}
                      {Number(item.amount).toLocaleString('vi-VN')} ₫
                    </p>
                  ))}
                </>
              )}
            </section>
          )}
        </>
      ) : (
        <p>
          <Link to="/ruong-vu">Chọn hoặc tạo ruộng và mùa vụ để ghi chép.</Link>
        </p>
      )}
    </div>
  );
}

function FarmingForm({
  title,
  busy,
  submit,
  children,
}: {
  title: string;
  busy: boolean;
  submit: (body: Record<string, FormDataEntryValue>) => Promise<unknown>;
  children: ReactNode;
}) {
  return (
    <details className="farm-card">
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
            /* Mutation error is shown above. */
          }
        }}
      >
        {children}
        <button className="farm-primary" disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </form>
    </details>
  );
}
