package models

type PengajuanUsahaRequest struct {
	NIK           string `json:"nik" binding:"required,len=16"`
	NamaUsaha     string `json:"nama_usaha" binding:"required"`
	JenisDagangan string `json:"jenis_dagangan" binding:"required"`
	Alamat        string `json:"alamat" binding:"required"`
}