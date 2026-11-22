const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfGenerator {
  static getFonts() {
    const regularFontPath = path.resolve(__dirname, '../../../assets/fonts/Roboto-Regular.ttf');
    const boldFontPath = path.resolve(__dirname, '../../../assets/fonts/Roboto-Bold.ttf');

    return {
      regular: fs.existsSync(regularFontPath) ? regularFontPath : 'Helvetica',
      bold: fs.existsSync(boldFontPath) ? boldFontPath : 'Helvetica-Bold'
    };
  }

  static async generateReportPdf(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Báo cáo Canh tác - ${reportData.cropSeason.seasonName}`,
            Author: 'Farming Service'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        const fonts = PdfGenerator.getFonts();
        if (fonts.regular !== 'Helvetica') {
          doc.registerFont('CustomRegular', fonts.regular);
          doc.registerFont('CustomBold', fonts.bold);
          doc.font('CustomRegular');
        }

        const fontRegular = fonts.regular !== 'Helvetica' ? 'CustomRegular' : 'Helvetica';
        const fontBold = fonts.bold !== 'Helvetica' ? 'CustomBold' : 'Helvetica-Bold';

        // ================= HEADER =================
        doc.fontSize(20).font(fontBold).text('HỆ THỐNG QUẢN LÝ CANH TÁC LÚA NƯỚC', { align: 'center' });
        doc.fontSize(14).font(fontRegular).text('BÁO CÁO LỊCH SỬ MÙA VỤ CANH TÁC', { align: 'center' });
        doc.moveDown(1.5);

        // ================= THÔNG TIN CƠ BẢN =================
        doc.fontSize(12).font(fontBold).text('1. THÔNG TIN THỬA RUỘNG & MÙA VỤ');
        doc.fontSize(10).font(fontRegular);
        doc.text(`- Tên thửa ruộng: ${reportData.plot.name || 'N/A'}`);
        doc.text(`- Diện tích: ${reportData.plot.area} m²`);
        doc.text(`- Địa điểm: ${reportData.plot.location || 'N/A'}`);
        if (reportData.plot.latitude && reportData.plot.longitude) {
          doc.text(`- Tọa độ GPS: Vĩ độ ${reportData.plot.latitude}, Kinh độ ${reportData.plot.longitude}`);
        }
        doc.text(`- Tên mùa vụ: ${reportData.cropSeason.seasonName}`);
        doc.text(`- Giống lúa (Crop Type): ${reportData.cropSeason.cropType}`);
        doc.text(`- Ngày bắt đầu vụ: ${reportData.cropSeason.startDate}`);
        doc.text(`- Ngày kết thúc vụ: ${reportData.cropSeason.endDate || 'Đang canh tác'}`);
        doc.text(`- Trạng thái vụ mùa: ${reportData.cropSeason.status}`);
        doc.moveDown(1.2);

        // ================= TỔNG KẾT NĂNG SUẤT & CHI PHÍ =================
        doc.fontSize(12).font(fontBold).text('2. TỔNG KẾT SỐ LIỆU VỤ MÙA');
        doc.fontSize(10).font(fontRegular);
        doc.text(`- Sản lượng kỳ vọng: ${reportData.summary.expectedYield !== null ? reportData.summary.expectedYield + ' kg' : 'Chưa thiết lập'}`);
        doc.text(`- Sản lượng thực tế: ${reportData.summary.actualYield !== null ? reportData.summary.actualYield + ' kg' : 'Chưa thu hoạch'}`);
        doc.text(`- Tổng chi phí phát sinh: ${reportData.summary.totalCost.toLocaleString('vi-VN')} VNĐ`);
        doc.moveDown(1.2);

        // ================= NHẬT KÝ CANH TÁC =================
        doc.fontSize(12).font(fontBold).text('3. NHẬT KÝ HOẠT ĐỘNG CANH TÁC');
        doc.fontSize(10).font(fontRegular);

        if (!reportData.farmingLogs || reportData.farmingLogs.length === 0) {
          doc.text('Không có nhật ký canh tác nào được ghi nhận.');
        } else {
          reportData.farmingLogs.forEach((log, idx) => {
            const qtyStr = log.quantity ? ` (Số lượng: ${log.quantity} ${log.unit || ''})` : '';
            doc.text(`${idx + 1}. [${log.workDate}] ${log.workType}${qtyStr}`);
            if (log.description) {
              doc.text(`   Mô tả: ${log.description}`);
            }
          });
        }
        doc.moveDown(1.2);

        // ================= CHI TIẾT CHI PHÍ =================
        doc.fontSize(12).font(fontBold).text('4. CHI TIẾT CÁC KHOẢN CHI PHÍ');
        doc.fontSize(10).font(fontRegular);

        if (!reportData.costs || reportData.costs.length === 0) {
          doc.text('Không có khoản chi phí nào được ghi nhận.');
        } else {
          reportData.costs.forEach((cost, idx) => {
            const amountFormatted = parseFloat(cost.amount).toLocaleString('vi-VN');
            doc.text(`${idx + 1}. [${cost.incurredDate}] Danh mục: ${cost.category} - Số tiền: ${amountFormatted} VNĐ`);
            if (cost.description) {
              doc.text(`   Ghi chú: ${cost.description}`);
            }
          });
        }
        doc.moveDown(2);

        // Footer
        doc.fontSize(9).font(fontRegular).text(`Báo cáo xuất tự động từ Farming Service vào lúc: ${new Date().toISOString()}`, {
          align: 'right'
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PdfGenerator;
