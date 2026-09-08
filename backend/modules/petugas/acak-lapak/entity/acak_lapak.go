package entity

// AcakJalanResponse adalah hasil acak nomor lapak untuk 1 jalan.
type AcakJalanResponse struct {
	JalanID      string `json:"jalan_id"`
	NamaJalan    string `json:"nama_jalan"`
	JumlahDiacak int    `json:"jumlah_diacak"`
}

// AcakKecamatanResponse adalah hasil acak nomor lapak untuk semua jalan
// dalam 1 kecamatan sekaligus.
type AcakKecamatanResponse struct {
	KecamatanID   string `json:"kecamatan_id"`
	NamaKecamatan string `json:"nama_kecamatan"`
	JumlahJalan   int    `json:"jumlah_jalan"`
	JumlahDiacak  int    `json:"jumlah_diacak"`
}

// AcakSemuaResponse adalah hasil acak nomor lapak untuk seluruh jalan se-
// Surabaya (semua kecamatan) dalam sesi CFD yang lagi aktif.
type AcakSemuaResponse struct {
	JumlahKecamatan int `json:"jumlah_kecamatan"`
	JumlahJalan     int `json:"jumlah_jalan"`
	JumlahDiacak    int `json:"jumlah_diacak"`
}
