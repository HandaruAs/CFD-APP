// features/petugas/data/laporan_export.dart
//
// Bikin file laporan kehadiran (PDF / Excel) lalu buka share sheet HP,
// biar petugas bisa simpan ke File, kirim lewat WhatsApp, dst. Isi &
// kolomnya disamain sama export di web (web/app/petugas/laporan):
//   - PDF  : judul, periode, ringkasan, tabel 8 kolom (landscape).
//   - Excel: judul, periode, tanggal cetak, ringkasan, tabel + TOTAL OMSET.
//
// Butuh package: pdf, excel, share_plus, path_provider.

import 'dart:io';

import 'package:excel/excel.dart' as xl;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import 'package:mobile/features/petugas/domain/entities/laporan.dart';
import 'package:mobile/features/petugas/presentation/utils/laporan_format.dart';

enum FormatExport { pdf, excel }

class LaporanExport {
  LaporanExport._();

  /// [periode] mis. "2026-09-24" atau "2026-09-01 s/d 2026-09-24".
  /// [namaFile] tanpa ekstensi, mis. "laporan-kehadiran-2026-09-24".
  static Future<void> exportDanBagikan({
    required FormatExport format,
    required LaporanResponse laporan,
    required String periode,
    required String namaFile,
  }) async {
    final List<int> bytes;
    final String ext;
    final String mime;

    if (format == FormatExport.pdf) {
      bytes = await _buatPdf(laporan, periode);
      ext = 'pdf';
      mime = 'application/pdf';
    } else {
      bytes = _buatExcel(laporan, periode);
      ext = 'xlsx';
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$namaFile.$ext');
    await file.writeAsBytes(bytes, flush: true);

    await SharePlus.instance.share(
      ShareParams(
        files: [XFile(file.path, mimeType: mime)],
        subject: 'Laporan Kehadiran Pedagang CFD',
        text: 'Laporan Kehadiran Pedagang CFD ($periode)',
      ),
    );
  }

  // ---------------------------------------------------------------- PDF

  static Future<List<int>> _buatPdf(LaporanResponse laporan, String periode) async {
    final doc = pw.Document();
    const biru = PdfColor.fromInt(0xFF1E3A8A);

    final headers = [
      'Check-in', 'Usaha', 'Pemilik', 'Kategori',
      'Lokasi', 'Status', 'Check-out', 'Omset',
    ];
    final rows = laporan.data.map((k) {
      return [
        k.waktuCheckin.isEmpty ? '-' : k.waktuCheckin,
        k.namaUsaha,
        k.pemilik,
        labelKategori(k.kategori),
        k.lokasiLapak.isEmpty ? '-' : k.lokasiLapak,
        labelStatusLaporan(k.status),
        k.waktuCheckout ?? '-',
        (k.omset ?? 0) > 0 ? formatRupiah(k.omset!) : '-',
      ];
    }).toList();

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(28),
        build: (_) => [
          pw.Text(
            'Laporan Kehadiran Pedagang CFD',
            style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 4),
          pw.Text('Periode: $periode', style: const pw.TextStyle(fontSize: 9)),
          pw.Text(
            'Check-in: ${laporan.totalCheckin}   Check-out: ${laporan.totalCheckout}   '
            'Total omset: ${formatRupiah(laporan.totalOmset)}',
            style: const pw.TextStyle(fontSize: 9),
          ),
          pw.SizedBox(height: 10),
          pw.TableHelper.fromTextArray(
            headers: headers,
            data: rows,
            headerStyle: pw.TextStyle(
              fontSize: 8,
              color: PdfColors.white,
              fontWeight: pw.FontWeight.bold,
            ),
            headerDecoration: const pw.BoxDecoration(color: biru),
            cellStyle: const pw.TextStyle(fontSize: 8),
            cellAlignment: pw.Alignment.centerLeft,
            cellPadding: const pw.EdgeInsets.symmetric(horizontal: 4, vertical: 3),
          ),
        ],
      ),
    );

    return doc.save();
  }

  // -------------------------------------------------------------- Excel

  static List<int> _buatExcel(LaporanResponse laporan, String periode) {
    final excel = xl.Excel.createExcel();
    const namaSheet = 'Laporan';
    excel.rename('Sheet1', namaSheet);
    final sheet = excel[namaSheet];

    final putih = xl.ExcelColor.fromHexString('#FFFFFF');
    final biru = xl.ExcelColor.fromHexString('#1E3A8A');
    final abu = xl.ExcelColor.fromHexString('#F1F5F9');

    xl.TextCellValue t(String v) => xl.TextCellValue(v);
    void gaya(int row, int col, xl.CellStyle style) {
      sheet
          .cell(xl.CellIndex.indexByColumnRow(columnIndex: col, rowIndex: row))
          .cellStyle = style;
    }

    final sekarang = DateTime.now();
    final dicetak = '${formatTanggalPanjang(sekarang)} '
        '${sekarang.hour.toString().padLeft(2, '0')}:${sekarang.minute.toString().padLeft(2, '0')}';

    // ---- judul & ringkasan ----
    sheet.appendRow([t('LAPORAN KEHADIRAN PEDAGANG CFD')]);
    sheet.appendRow([t('Periode: $periode')]);
    sheet.appendRow([t('Dicetak: $dicetak')]);
    sheet.appendRow([]);
    sheet.appendRow([t('Ringkasan')]);
    final barisRingkasanAwal = 5;
    sheet.appendRow([t('Pedagang check-in'), null, null, xl.IntCellValue(laporan.totalCheckin)]);
    sheet.appendRow([t('Pedagang check-out'), null, null, xl.IntCellValue(laporan.totalCheckout)]);
    sheet.appendRow([t('Total omset'), null, null, t(formatRupiah(laporan.totalOmset))]);
    sheet.appendRow([t('Rata-rata omset'), null, null, t(formatRupiah(laporan.rataOmset))]);
    sheet.appendRow([]);

    gaya(0, 0, xl.CellStyle(bold: true, fontSize: 14, fontColorHex: biru));
    gaya(4, 0, xl.CellStyle(bold: true));
    for (var r = barisRingkasanAwal; r < barisRingkasanAwal + 4; r++) {
      gaya(r, 3, xl.CellStyle(bold: true));
    }

    // ---- tabel ----
    const header = [
      'No', 'Check-in', 'Check-out', 'Nama Usaha', 'Pemilik',
      'Kategori', 'Lokasi', 'Status', 'Omset',
    ];
    final barisHeader = 10;
    sheet.appendRow(header.map(t).toList());
    for (var c = 0; c < header.length; c++) {
      gaya(barisHeader, c, xl.CellStyle(
        bold: true,
        fontColorHex: putih,
        backgroundColorHex: biru,
        horizontalAlign: xl.HorizontalAlign.Center,
      ));
    }

    var totalOmset = 0;
    for (var i = 0; i < laporan.data.length; i++) {
      final k = laporan.data[i];
      final omset = k.omset ?? 0;
      totalOmset += omset;
      sheet.appendRow([
        xl.IntCellValue(i + 1),
        t(k.waktuCheckin.isEmpty ? '-' : k.waktuCheckin),
        t(k.waktuCheckout ?? '-'),
        t(k.namaUsaha),
        t(k.pemilik),
        t(labelKategori(k.kategori)),
        t(k.lokasiLapak.isEmpty ? '-' : k.lokasiLapak),
        t(labelStatusLaporan(k.status)),
        xl.IntCellValue(omset),
      ]);
      if (i.isOdd) {
        for (var c = 0; c < header.length; c++) {
          gaya(barisHeader + 1 + i, c, xl.CellStyle(backgroundColorHex: abu));
        }
      }
    }

    final barisTotal = barisHeader + 1 + laporan.data.length;
    sheet.appendRow([
      null, null, null, null, null, null, null,
      t('TOTAL OMSET'),
      xl.IntCellValue(totalOmset),
    ]);
    gaya(barisTotal, 7, xl.CellStyle(bold: true));
    gaya(barisTotal, 8, xl.CellStyle(bold: true));

    // ---- lebar kolom ----
    const lebar = [6.0, 11.0, 11.0, 26.0, 20.0, 22.0, 36.0, 13.0, 14.0];
    for (var c = 0; c < lebar.length; c++) {
      sheet.setColumnWidth(c, lebar[c]);
    }

    return excel.encode() ?? <int>[];
  }
}