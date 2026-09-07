/// Model buat GET /api/petugas/sisa-lapak (array KecamatanData langsung
/// di root response, BUKAN dibungkus object) dan GET .../instansi.

class JalanData {
  final String id;
  final String kodeJalan;
  final String nama;
  final int kuota;
  final int terisi;

  JalanData({
    required this.id,
    required this.kodeJalan,
    required this.nama,
    required this.kuota,
    required this.terisi,
  });

  int get sisa => (kuota - terisi).clamp(0, kuota);

  factory JalanData.fromJson(Map<String, dynamic> json) {
    return JalanData(
      id: json['id'] as String,
      kodeJalan: json['kode_jalan'] as String,
      nama: json['nama'] as String,
      kuota: json['kuota'] as int,
      terisi: json['terisi'] as int,
    );
  }
}

class KecamatanData {
  final String kecamatan;
  final List<JalanData> jalan;

  KecamatanData({required this.kecamatan, required this.jalan});

  factory KecamatanData.fromJson(Map<String, dynamic> json) {
    return KecamatanData(
      kecamatan: json['kecamatan'] as String,
      jalan: (json['jalan'] as List<dynamic>)
          .map((e) => JalanData.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Dipakai buat dropdown pilih kecamatan/instansi pas tambah jalan baru.
class InstansiData {
  final String id;
  final String nama;

  InstansiData({required this.id, required this.nama});

  factory InstansiData.fromJson(Map<String, dynamic> json) {
    return InstansiData(
      id: json['id'] as String,
      nama: json['nama'] as String,
    );
  }
}