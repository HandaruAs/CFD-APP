class PedagangDashboardData {
  final int totalPengajuan;
  final int pengajuanPending;
  final int pengajuanDiterima;
  final int pengajuanDitolak;
  final String statusPengajuanTerakhir; // Misal: "Diproses", "Diterima", "Ditolak"

  PedagangDashboardData({
    required this.totalPengajuan,
    required this.pengajuanPending,
    required this.pengajuanDiterima,
    required this.pengajuanDitolak,
    required this.statusPengajuanTerakhir,
  });

  factory PedagangDashboardData.fromJson(Map<String, dynamic> json) {
    return PedagangDashboardData(
      totalPengajuan: json['total_pengajuan'] ?? 0,
      pengajuanPending: json['pengajuan_pending'] ?? 0,
      pengajuanDiterima: json['pengajuan_diterima'] ?? 0,
      pengajuanDitolak: json['pengajuan_ditolak'] ?? 0,
      statusPengajuanTerakhir: json['status_pengajuan_terakhir'] ?? 'Belum ada pengajuan',
    );
  }
}