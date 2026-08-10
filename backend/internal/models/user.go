package models

type RegisterPedagangRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Password      string `json:"password" binding:"required,min=8"`
	Name          string `json:"name" binding:"required"`
	Phone         string `json:"phone"`
	NIK           string `json:"nik" binding:"required,len=16"`
	NamaUsaha     string `json:"nama_usaha" binding:"required"`
	JenisDagangan string `json:"jenis_dagangan" binding:"required"`
	Alamat        string `json:"alamat" binding:"required"`
}