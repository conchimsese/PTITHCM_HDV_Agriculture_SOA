import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCreateListing } from '../hooks/useCreateListing';
import { formatVND, formatYield } from '../../../shared/utils/formatters';
import { tradingApi } from '../../../shared/api/runtime';
import { useSession } from '../../../shared/hooks/useAuth';
import { usePlotSeasons, usePlots } from '../../farming/api/farmingApi';

// Sample plots/seasons for convenient testing and pre-filling
const SAMPLE_PLOTS = [
  {
    name: 'Ruộng ST25 Mỹ Xuyên (Sóc Trăng)',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    defaultPrice: '4500000.00',
    desc: 'Diện tích 1,2 ha · Dự kiến thu hoạch 5 tấn lúa giống ST25',
  },
  {
    name: 'Ruộng OM18 Thoại Sơn (An Giang)',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
    defaultPrice: '3800000.00',
    desc: 'Diện tích 1,5 ha · Dự kiến thu hoạch 6 tấn lúa OM18',
  },
  {
    name: 'Ruộng Đài Thơm 8 Tháp Mười (Đồng Tháp)',
    plotId: '3fa85f64-5717-4562-b3fc-2c963f66afa8',
    cropSeasonId: '7c9e6679-7425-40de-944b-e07fc1f90ae9',
    defaultPrice: '4200000.00',
    desc: 'Diện tích 1,0 ha · Dự kiến thu hoạch 4,5 tấn Đài Thơm 8',
  },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MiB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function CreateListingForm() {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [plotId, setPlotId] = useState(() => searchParams.get('plotId') ?? '');
  const [cropSeasonId, setCropSeasonId] = useState(() => searchParams.get('cropSeasonId') ?? '');
  const [priceInput, setPriceInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isDemo = Boolean(session?.isDemo);
  const plotsQuery = usePlots(session?.accountId, !isDemo);
  const resolvedPlotId = plotId || (!isDemo ? (plotsQuery.data?.items[0]?.plotId ?? '') : '');
  const seasonsQuery = usePlotSeasons(
    session?.accountId,
    resolvedPlotId,
    !isDemo && Boolean(resolvedPlotId),
  );
  const resolvedSeasonId =
    cropSeasonId || (!isDemo ? (seasonsQuery.data?.items[0]?.cropSeasonId ?? '') : '');

  const activePlot = plotsQuery.data?.items.find((item) => item.plotId === resolvedPlotId);
  const activeSeason = seasonsQuery.data?.items.find(
    (item) => item.cropSeasonId === resolvedSeasonId,
  );

  const createListingMutation = useCreateListing();

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const handleSelectSample = (sample: (typeof SAMPLE_PLOTS)[0]) => {
    setPlotId(sample.plotId);
    setCropSeasonId(sample.cropSeasonId);
    setPriceInput(sample.defaultPrice);
    setValidationError(null);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setPriceInput(raw);
    setValidationError(null);
  };

  const handlePriceBlur = () => {
    if (!priceInput) return;
    const num = parseFloat(priceInput);
    if (!isNaN(num) && num > 0) {
      setPriceInput(num.toFixed(2));
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setValidationError(null);

    const availableSlots = MAX_PHOTOS - selectedFiles.length;
    if (availableSlots <= 0) {
      setValidationError(`Bạn đã chọn đủ tối đa ${MAX_PHOTOS} ảnh nông sản.`);
      return;
    }

    const rawList = Array.from(files);
    const validFiles: File[] = [];

    for (const file of rawList) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setValidationError(
          `Định dạng "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP.`,
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5 MiB.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > availableSlots) {
      setValidationError(
        `Chỉ có thể thêm thêm ${availableSlots} ảnh nữa (tối đa ${MAX_PHOTOS} ảnh/bài đăng).`,
      );
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length === 0) return;

    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));

    setSelectedFiles((prev) => [...prev, ...filesToAdd]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    const urlToRemove = previewUrls[index];
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanPlotId = resolvedPlotId.trim();
    const cleanCropSeasonId = resolvedSeasonId.trim();
    let cleanPrice = priceInput.trim();

    if (!UUID_REGEX.test(cleanPlotId)) {
      setValidationError('Vui lòng chọn thửa ruộng hợp lệ (định dạng UUID).');
      return;
    }

    if (!UUID_REGEX.test(cleanCropSeasonId)) {
      setValidationError('Vui lòng chọn mùa vụ canh tác hợp lệ (định dạng UUID).');
      return;
    }

    const numericPrice = parseFloat(cleanPrice);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setValidationError('Giá mong muốn phải là số tiền dương.');
      return;
    }

    cleanPrice = numericPrice.toFixed(2);

    if (selectedFiles.length === 0) {
      setValidationError(
        'Vui lòng chụp hoặc tải lên ít nhất 1 hình ảnh nông sản thực tế (tối thiểu 1, tối đa 5 ảnh).',
      );
      return;
    }

    try {
      setIsUploading(true);
      // Step 1: Upload produce pictures to Cloudinary CDN via /api/v1/listings/upload
      const uploadedUrls = await tradingApi.uploadImages(selectedFiles);

      // Step 2: Create listing with uploaded image URLs
      await createListingMutation.mutateAsync({
        plotId: cleanPlotId,
        cropSeasonId: cleanCropSeasonId,
        expectedPrice: cleanPrice,
        images: uploadedUrls,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải ảnh hoặc đăng bài.';
      setValidationError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitting = isUploading || createListingMutation.isPending;

  const errorMessage =
    validationError ||
    (createListingMutation.error
      ? createListingMutation.error.message.includes('SNAPSHOT_INCOMPLETE')
        ? 'Mùa vụ canh tác này chưa hoàn thiện thông tin (giống lúa, sản lượng hoặc tọa độ ruộng). Vui lòng bổ sung dữ liệu canh tác trước khi đăng bài.'
        : createListingMutation.error.message.includes('DEPENDENCY_UNAVAILABLE')
          ? 'Không kết nối được dịch vụ canh tác. Vui lòng kiểm tra lại sau.'
          : createListingMutation.error.message
      : null);

  return (
    <div className="create-listing-card">
      {isDemo && (
        <div className="sample-plots-box">
          <span className="sample-plots-title">💡 Chọn nhanh dữ liệu minh họa (Demo cục bộ):</span>
          <div className="sample-plots-list">
            {SAMPLE_PLOTS.map((sample) => (
              <button
                key={sample.plotId}
                type="button"
                className={`sample-plot-btn ${resolvedPlotId === sample.plotId ? 'selected' : ''}`}
                onClick={() => handleSelectSample(sample)}
              >
                <span className="sample-plot-name">{sample.name}</span>
                <span className="sample-plot-desc">{sample.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="listing-form">
        <fieldset disabled={isSubmitting} className="form-fieldset">
          {!isDemo && (
            <>
              {plotsQuery.isPending ? (
                <p role="status">Đang tải danh sách thửa ruộng và mùa vụ từ hệ thống…</p>
              ) : plotsQuery.isError ? (
                <div className="alert alert-error" role="alert">
                  Không tải được danh sách thửa ruộng: {plotsQuery.error.message}{' '}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void plotsQuery.refetch()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : (plotsQuery.data?.items.length ?? 0) === 0 ? (
                <div className="info-banner" role="status">
                  <div>
                    <strong>Bạn chưa có thửa ruộng nào trên hệ thống.</strong>
                    <p style={{ margin: '6px 0 10px' }}>
                      Hãy tạo thửa ruộng và mùa vụ trước để hệ thống tự động điền giống lúa, sản
                      lượng và tọa độ GPS.
                    </p>
                    <Link to="/ruong-vu" className="secondary-button">
                      Đến trang Ruộng &amp; mùa vụ →
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <label className="form-field">
                    <span className="field-label">
                      Chọn thửa ruộng <span className="required">*</span>
                    </span>
                    <select
                      className="form-input"
                      value={resolvedPlotId}
                      onChange={(e) => {
                        setPlotId(e.target.value);
                        setCropSeasonId('');
                        setValidationError(null);
                      }}
                    >
                      {plotsQuery.data?.items.map((item) => (
                        <option key={item.plotId} value={item.plotId}>
                          {item.name} · {item.location}
                        </option>
                      ))}
                    </select>
                    {activePlot && (
                      <span className="field-hint">
                        Vị trí: {activePlot.location}
                        {activePlot.area
                          ? ` · Diện tích ${Number(activePlot.area).toLocaleString('vi-VN')} m²`
                          : ''}
                      </span>
                    )}
                  </label>

                  <label className="form-field">
                    <span className="field-label">
                      Chọn mùa vụ canh tác <span className="required">*</span>
                    </span>
                    <select
                      className="form-input"
                      value={resolvedSeasonId}
                      disabled={seasonsQuery.isPending}
                      onChange={(e) => {
                        setCropSeasonId(e.target.value);
                        setValidationError(null);
                      }}
                    >
                      {seasonsQuery.isPending && <option value="">Đang tải mùa vụ…</option>}
                      {!seasonsQuery.isPending && (seasonsQuery.data?.items.length ?? 0) === 0 && (
                        <option value="">Thửa ruộng này chưa có mùa vụ nào</option>
                      )}
                      {seasonsQuery.data?.items.map((item) => (
                        <option key={item.cropSeasonId} value={item.cropSeasonId}>
                          {item.seasonName} · Giống {item.cropType}
                          {item.expectedYield != null
                            ? ` (${formatYield(Number(item.expectedYield))})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    {!seasonsQuery.isPending && (seasonsQuery.data?.items.length ?? 0) === 0 ? (
                      <span className="field-hint">
                        Thửa ruộng này chưa có mùa vụ. <Link to="/ruong-vu">Tạo mùa vụ mới →</Link>
                      </span>
                    ) : (
                      activeSeason && (
                        <span className="field-hint">
                          Giống lúa: <strong>{activeSeason.cropType}</strong>
                          {activeSeason.expectedYield != null
                            ? ` · Sản lượng dự kiến ${formatYield(Number(activeSeason.expectedYield))}`
                            : ''}
                        </span>
                      )
                    )}
                  </label>
                </>
              )}
            </>
          )}

          <details open={isDemo}>
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isDemo ? 'Mã thửa ruộng & mùa vụ' : 'Nhập mã UUID thủ công (nâng cao)'}
            </summary>
            <div style={{ display: 'grid', gap: '14px', paddingTop: '10px' }}>
              <label className="form-field">
                <span className="field-label">
                  Mã thửa ruộng (plotId) <span className="required">*</span>
                </span>
                <input
                  type="text"
                  name="plotId"
                  value={resolvedPlotId}
                  onChange={(e) => {
                    setPlotId(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Ví dụ: 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  required
                  className="form-input monospace"
                />
              </label>

              <label className="form-field">
                <span className="field-label">
                  Mã mùa vụ thu hoạch (cropSeasonId) <span className="required">*</span>
                </span>
                <input
                  type="text"
                  name="cropSeasonId"
                  value={resolvedSeasonId}
                  onChange={(e) => {
                    setCropSeasonId(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Ví dụ: 7c9e6679-7425-40de-944b-e07fc1f90ae7"
                  required
                  className="form-input monospace"
                />
              </label>
            </div>
          </details>

          {/* Facebook-Style Produce Picture Composer (System Color & Format) */}
          <div className="form-field photo-upload-field">
            <div className="photo-label-row">
              <span className="field-label">
                Hình ảnh thực tế nông sản <span className="required">*</span>
              </span>
              <span className="photo-counter-badge">
                {selectedFiles.length}/{MAX_PHOTOS} ảnh
                {selectedFiles.length === 0 && (
                  <span className="counter-warning"> (Cần ít nhất 1 ảnh)</span>
                )}
              </span>
            </div>
            <span className="field-hint">
              Chụp ảnh thực tế hạt lúa, bông lúa tại ruộng hoặc kho trữ để thương lái dễ dàng thẩm
              định chất lượng (tối đa 5MB/ảnh, định dạng JPG/PNG/WebP).
            </span>

            {/* Thumbnail Preview Grid (Facebook-Style collage matching system theme) */}
            {previewUrls.length > 0 && (
              <div className="photo-preview-grid">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="photo-preview-card">
                    <img src={url} alt={`Ảnh nông sản ${idx + 1}`} className="photo-preview-img" />
                    {idx === 0 && <span className="photo-cover-tag">Ảnh bìa</span>}
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => removePhoto(idx)}
                      title="Xóa ảnh này"
                      aria-label={`Xóa ảnh ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons: Camera & Gallery */}
            <div className="photo-actions-row">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="visually-hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
                disabled={selectedFiles.length >= MAX_PHOTOS || isSubmitting}
              />
              <button
                type="button"
                className="secondary-button photo-action-btn"
                onClick={() => cameraInputRef.current?.click()}
                disabled={selectedFiles.length >= MAX_PHOTOS || isSubmitting}
              >
                <span className="btn-icon" aria-hidden="true">
                  📸
                </span>
                <span>Chụp ảnh thực tế (Camera)</span>
              </button>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="visually-hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';
                }}
                disabled={selectedFiles.length >= MAX_PHOTOS || isSubmitting}
              />
              <button
                type="button"
                className="secondary-button photo-action-btn"
                onClick={() => galleryInputRef.current?.click()}
                disabled={selectedFiles.length >= MAX_PHOTOS || isSubmitting}
              >
                <span className="btn-icon" aria-hidden="true">
                  🖼️
                </span>
                <span>Chọn từ thư viện máy</span>
              </button>
            </div>
          </div>

          {/* Expected Price */}
          <label className="form-field">
            <span className="field-label">
              Giá mong muốn toàn bộ sản lượng (VND) <span className="required">*</span>
            </span>
            <div className="price-input-wrapper">
              <input
                type="text"
                name="expectedPrice"
                value={priceInput}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
                placeholder="Ví dụ: 4500000.00"
                required
                className="form-input"
              />
              <span className="currency-suffix">VND</span>
            </div>
            {priceInput && (
              <div className="price-preview-pill">
                Hiển thị trên thị trường: <strong>{formatVND(priceInput)}</strong>
              </div>
            )}
            <span className="field-hint">
              Nhập số tiền theo định dạng số thực dương (ví dụ: 4500000.00).
            </span>
          </label>

          <div className="info-banner">
            <span className="info-icon" aria-hidden="true">
              ℹ️
            </span>
            <span>
              Theo quy chuẩn hệ thống, bài đăng sau khi tạo sẽ ở trạng thái <strong>OPEN</strong> để
              nhận báo giá từ thương lái. Nông dân có thể chấp nhận nhiều báo giá để cùng trao đổi,
              và chỉ khóa độc quyền khi thương lái đặt cọc thành công.
            </span>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button submit-btn"
              disabled={isSubmitting || selectedFiles.length === 0}
            >
              {isUploading
                ? 'Đang tải ảnh lên hệ thống…'
                : createListingMutation.isPending
                  ? 'Đang tạo bài đăng…'
                  : 'Xác nhận đăng bài bán lúa →'}
            </button>
            <Link to="/bai-dang" className="secondary-button cancel-btn">
              Hủy bỏ
            </Link>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
