package entity

type JalanData struct {
	ID         string `json:"id"`
	KodeJalan  string `json:"kode_jalan"`
	Nama       string `json:"nama"`
	Kuota      int    `json:"kuota"`
	Terisi     int    `json:"terisi"`
}

type KecamatanData struct {
	Kecamatan string      `json:"kecamatan"`
	Jalan     []JalanData `json:"jalan"`
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
	NamaJalan string `json:"nama_jalan" validate:"required"`
	Kapasitas int    `json:"kapasitas" validate:"required,gt=0"`
}