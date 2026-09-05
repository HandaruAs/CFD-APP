class JadwalMingguan {
  final String hari; // "senin".."minggu"
  final String jamMulai;
  final String jamSelesaiRencana;
  final bool isActive;

  JadwalMingguan({
    required this.hari,
    required this.jamMulai,
    required this.jamSelesaiRencana,
    required this.isActive,
  });

  factory JadwalMingguan.fromJson(Map<String, dynamic> json) {
    return JadwalMingguan(
      hari: json['hari'] as String,
      jamMulai: json['jamMulai'] as String,
      jamSelesaiRencana: json['jamSelesaiRencana'] as String,
      isActive: json['isActive'] as bool,
    );
  }
}

const kUrutanHari = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

const kLabelHari = {
  'senin': 'Senin',
  'selasa': 'Selasa',
  'rabu': 'Rabu',
  'kamis': 'Kamis',
  'jumat': 'Jumat',
  'sabtu': 'Sabtu',
  'minggu': 'Minggu',
};