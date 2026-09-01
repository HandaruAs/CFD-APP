package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/pedagang/checkout/entity"
)

type CheckoutRepository interface {
	GetPedagangProfileIDByUserID(ctx context.Context, userID string) (string, error)
	GetActiveSessionID(ctx context.Context) (string, error)
	GetTodaySessionID(ctx context.Context) (string, error)
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

	sessionID, err := u.repo.GetTodaySessionID(ctx)
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

	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
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