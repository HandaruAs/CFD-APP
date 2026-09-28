package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/pedagang/checkout/entity"
)

type CheckoutRepository interface {
	GetPedagangProfileIDByUserID(ctx context.Context, userID string) (string, error)
	GetTodaySessionID(ctx context.Context) (string, error)
	GetSesiKehadiranBelumCheckout(ctx context.Context, pedagangID string) (string, error)
	PastikanSesiSelesai(ctx context.Context, sessionID string) error
	GetDataCheckout(ctx context.Context, pedagangID, sessionID string) (*entity.DataCheckoutResponse, error)
	SubmitCheckout(ctx context.Context, pedagangID, sessionID string, omset int64) (time.Time, error)
}

type CheckoutUsecase interface {
	GetDataCheckout(ctx context.Context, userID string) (*entity.DataCheckoutResponse, error)
	SubmitCheckout(ctx context.Context, userID string, omset int64) (*entity.SubmitCheckoutResponse, error)
}

type checkoutUsecase struct {
	repo CheckoutRepository
}

func NewCheckoutUsecase(repo CheckoutRepository) CheckoutUsecase {
	return &checkoutUsecase{repo: repo}
}

func (u *checkoutUsecase) GetDataCheckout(ctx context.Context, userID string) (*entity.DataCheckoutResponse, error) {
	pedagangID, err := u.repo.GetPedagangProfileIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	sessionID, err := u.sesiUntukCheckout(ctx, pedagangID)
	if err != nil {
		return nil, err
	}

	return u.repo.GetDataCheckout(ctx, pedagangID, sessionID)
}

func (u *checkoutUsecase) SubmitCheckout(ctx context.Context, userID string, omset int64) (*entity.SubmitCheckoutResponse, error) {
	pedagangID, err := u.repo.GetPedagangProfileIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	sessionID, err := u.repo.GetSesiKehadiranBelumCheckout(ctx, pedagangID)
	if err != nil {
		return nil, err
	}

	if sessionID != "" {
		// Ada kehadiran yang belum checkout -- checkout-nya ke sesi itu,
		// asal sesinya udah berakhir.
		if err := u.repo.PastikanSesiSelesai(ctx, sessionID); err != nil {
			return nil, err
		}
	} else {
		// Gak ada yang menggantung: berarti belum check-in atau udah
		// checkout. Pakai sesi hari ini biar repo.SubmitCheckout bisa
		// balikin error yang tepat (ErrBelumCheckIn / ErrSudahCheckOut).
		sessionID, err = u.repo.GetTodaySessionID(ctx)
		if err != nil {
			return nil, err
		}
	}

	checkOutAt, err := u.repo.SubmitCheckout(ctx, pedagangID, sessionID, omset)
	if err != nil {
		return nil, err
	}

	return &entity.SubmitCheckoutResponse{
		Message:    "cek-out berhasil, terima kasih sudah berjualan hari ini",
		CheckOutAt: checkOutAt,
		Omset:      omset,
	}, nil
}

// sesiUntukCheckout nentuin sesi mana yang ditampilin di halaman checkout:
// kehadiran yang belum checkout (sesi mana pun) diutamakan, baru kalau gak
// ada pakai sesi hari ini. Ini yang bikin pedagang yang ditolak check-in
// karena BELUM_CHECKOUT bisa langsung nyelesain checkout sesi lamanya.
func (u *checkoutUsecase) sesiUntukCheckout(ctx context.Context, pedagangID string) (string, error) {
	sessionID, err := u.repo.GetSesiKehadiranBelumCheckout(ctx, pedagangID)
	if err != nil {
		return "", err
	}
	if sessionID != "" {
		return sessionID, nil
	}
	return u.repo.GetTodaySessionID(ctx)
}