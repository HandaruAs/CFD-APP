package entity

type JalanData struct {
	ID         string `json:"id"`
	KodeJalan  string `json:"kode_jalan"`
	Nama       string `json:"nama"`
	Kuota      int    `json:"kuota"`  // kapasitas master jalan (dipakai form edit)
	Terisi     int    `json:"terisi"` // pedagang yang ikut event HARI INI di jalan ini (tidak batal)
	// KuotaHariIni: jumlah kapasitas titik lokasi event hari ini di jalan
	// ini; 0 kalau jalan ini tidak dipakai event hari ini.
	KuotaHariIni int `json:"kuotaHariIni"`
}

type KecamatanData struct {
	KecamatanID *string     `json:"kecamatanId"`
	Kecamatan   string      `json:"kecamatan"`
	Jalan       []JalanData `json:"jalan"`
}

// CRUD
type InstansiData struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

type CreateJalanRequest struct {
	KodeJalan  string `json:"kode_jalan" validate:"required"`
	NamaJalan  string `json:"nama_jalan" validate:"required"`
	Kapasitas  int    `json:"kapasitas" validate:"required,gt=0"`
	InstansiID string `json:"instansi_id" validate:"required"`
}

type UpdateJalanRequest struct {
	KodeJalan string `json:"kode_jalan" validate:"required"`
	NamaJalan string `json:"nama_jalan" validate:"required"`
	Kapasitas int    `json:"kapasitas" validate:"required,gt=0"`
}