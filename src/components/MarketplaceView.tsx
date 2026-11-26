import React, { useMemo, useState } from 'react';
import {
  Filter,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react';
import { ITEM_CATALOG } from '../game/constants';
import {
  calculateMarketTax,
  formatNumber,
  getVipPerks,
} from '../game/economy';
import type {
  CurrencyType,
  ItemCategory,
  MarketListing,
  UserGameData,
} from '../game/types';

interface MarketplaceViewProps {
  user: UserGameData;
  listings: MarketListing[];
  preselectedItemId: string | null;
  onClearPreselected: () => void;
  onCreateListing: (
    itemId: string,
    quantity: number,
    currency: CurrencyType,
    price: number
  ) => Promise<void>;
  onBuyListing: (listing: MarketListing) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  user,
  listings,
  preselectedItemId,
  onClearPreselected,
  onCreateListing,
  onBuyListing,
  onCancelListing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ItemCategory>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | CurrencyType>('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const inventoryItems = Object.entries(user.inventory).filter(([, qty]) => qty > 0);
  const [sellItemId, setSellItemId] = useState<string>(
    preselectedItemId || inventoryItems[0]?.[0] || ''
  );
  const [sellQty, setSellQty] = useState<number>(1);
  const [sellCurrency, setSellCurrency] = useState<CurrencyType>('gold');
  const [sellPrice, setSellPrice] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);
  const [busyListingId, setBusyListingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (preselectedItemId && (user.inventory[preselectedItemId] || 0) > 0) {
      setSellItemId(preselectedItemId);
      const base = ITEM_CATALOG[preselectedItemId]?.baseSellPrice || 50;
      setSellQty(1);
      setSellPrice(Math.round(base * 1.15));
      onClearPreselected();
    }
  }, [preselectedItemId, user.inventory, onClearPreselected]);

  const myVipPerks = getVipPerks(user.vipLevel);
  const taxPreview = calculateMarketTax(sellPrice, user.vipLevel);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((l) => {
      if (onlyMine && l.sellerUid !== user.uid) return false;
      if (currencyFilter !== 'all' && l.currency !== currencyFilter) return false;
      const item = ITEM_CATALOG[l.itemId];
      if (categoryFilter !== 'all' && item?.category !== categoryFilter) {
        return false;
      }
      if (q) {
        const matchName = item?.name.toLowerCase().includes(q);
        const matchSeller = l.sellerName.toLowerCase().includes(q);
        if (!matchName && !matchSeller) return false;
      }
      return true;
    });
  }, [listings, searchQuery, categoryFilter, currencyFilter, onlyMine, user.uid]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItemId) return;
    setSubmitting(true);
    try {
      await onCreateListing(sellItemId, sellQty, sellCurrency, sellPrice);
      setSellQty(1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & VIP Tax Transparency */}
      <div className="bg-white rounded-2xl border border-[#DCE7D3] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Chợ Giao Thương P2P
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tự do giao dịch nông sản, thành phẩm và vật phẩm với người chơi khác bằng Vàng hoặc Xu DOPI.
          </p>
        </div>
        <div className="text-left sm:text-right text-xs">
          <div className="text-slate-500">
            Thuế sàn hiện tại của bạn (VIP {user.vipLevel})
          </div>
          <div className="text-base font-bold font-mono-num text-emerald-700">
            {myVipPerks.marketTaxPct}%{' '}
            <span className="text-xs font-sans font-normal text-slate-500">
              (Mặc định 8% · VIP 10 chỉ còn 3%)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Create P2P Listing Form */}
        <section className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE7D3] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Treo Bán Mặt Hàng
            </h2>
          </div>

          {inventoryItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              Kho của bạn chưa có vật phẩm nào để đăng bán.
            </p>
          ) : (
            <form onSubmit={handlePublish} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="market-sell-item"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Chọn vật phẩm trong kho
                </label>
                <select
                  id="market-sell-item"
                  value={sellItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSellItemId(id);
                    const base = ITEM_CATALOG[id]?.baseSellPrice || 50;
                    setSellPrice(Math.round(base * sellQty * 1.1));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">-- Chọn vật phẩm --</option>
                  {inventoryItems.map(([id, qty]) => {
                    const info = ITEM_CATALOG[id];
                    return (
                      <option key={id} value={id}>
                        {info?.emoji} {info?.name ?? id} (Có: {qty})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="market-sell-qty"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Số lượng
                  </label>
                  <input
                    id="market-sell-qty"
                    type="number"
                    min={1}
                    max={sellItemId ? user.inventory[sellItemId] || 1 : 1}
                    required
                    value={sellQty}
                    onChange={(e) => setSellQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] font-mono-num text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="market-sell-currency"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Loại tiền
                  </label>
                  <select
                    id="market-sell-currency"
                    value={sellCurrency}
                    onChange={(e) => setSellCurrency(e.target.value as CurrencyType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm"
                  >
                    <option value="gold">Vàng</option>
                    <option value="coins">Xu DOPI</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="market-sell-price"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tổng giá bán ({sellCurrency === 'gold' ? 'Vàng' : 'Xu DOPI'})
                </label>
                <input
                  id="market-sell-price"
                  type="number"
                  min={1}
                  max={10000000}
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] font-mono-num text-sm"
                />
              </div>

              {/* Tax Calculation Summary */}
              <div className="rounded-xl bg-[#F8FBF4] border border-[#E2ECDA] p-3 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Thuế sàn ({taxPreview.taxRatePct}%):</span>
                  <span className="font-mono-num text-rose-600">
                    -{formatNumber(taxPreview.taxAmount)}{' '}
                    {sellCurrency === 'gold' ? 'V' : 'Xu'}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Thực nhận khi bán xong:</span>
                  <span className="font-mono-num text-emerald-700">
                    +{formatNumber(taxPreview.netSellerPayout)}{' '}
                    {sellCurrency === 'gold' ? 'Vàng' : 'Xu DOPI'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !sellItemId}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'Đang đăng bán...' : 'Đăng lên Chợ P2P'}
              </button>
            </form>
          )}
        </section>

        {/* Right: Browse & Filter Listings */}
        <section className="lg:col-span-8 space-y-4">
          {/* Search + Filters */}
          <div className="bg-white rounded-2xl border border-[#DCE7D3] p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên nông sản, thành phẩm hoặc chủ shop..."
                aria-label="Tìm kiếm trên chợ P2P"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-[#FAFDF8] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                aria-label="Lọc danh mục"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as 'all' | ItemCategory)
                }
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
              >
                <option value="all">Mọi danh mục</option>
                <option value="crop">Nông sản</option>
                <option value="product">Thành phẩm</option>
                <option value="booster">Vật phẩm</option>
              </select>

              <select
                aria-label="Lọc loại tiền"
                value={currencyFilter}
                onChange={(e) =>
                  setCurrencyFilter(e.target.value as 'all' | CurrencyType)
                }
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
              >
                <option value="all">Vàng & Xu DOPI</option>
                <option value="gold">Chỉ Vàng</option>
                <option value="coins">Chỉ Xu DOPI</option>
              </select>

              <button
                type="button"
                onClick={() => setOnlyMine((v) => !v)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  onlyMine
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Đơn của tôi
              </button>
            </div>
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              Không tìm thấy mặt hàng nào khớp bộ lọc trên Chợ P2P.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredListings.map((listing) => {
                const item = ITEM_CATALOG[listing.itemId];
                const isMine = listing.sellerUid === user.uid;
                const sellerTax = calculateMarketTax(
                  listing.price,
                  listing.sellerVipLevel
                );
                const canAfford =
                  listing.currency === 'gold'
                    ? user.gold >= listing.price
                    : user.dopiCoins >= listing.price;

                return (
                  <div
                    key={listing.id}
                    className="bg-white rounded-2xl border border-[#DCE7D3] p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-xl bg-[#F5F9F0] border border-[#DCE7D3] flex items-center justify-center text-2xl shrink-0">
                          {item?.emoji ?? '📦'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">
                            {item?.name ?? listing.itemId}{' '}
                            <span className="font-mono-num text-emerald-700">
                              ×{listing.quantity}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {listing.sellerName} · VIP {listing.sellerVipLevel}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono-num shrink-0">
                        <div
                          className={`text-base font-bold ${
                            listing.currency === 'coins'
                              ? 'text-violet-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {formatNumber(listing.price)}{' '}
                          {listing.currency === 'coins' ? 'Xu' : 'V'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Thuế {sellerTax.taxRatePct}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        Đơn giá ~{formatNumber(Math.round(listing.price / listing.quantity))}{' '}
                        {listing.currency === 'coins' ? 'Xu' : 'V'}/sp
                      </span>

                      {isMine ? (
                        <button
                          type="button"
                          disabled={busyListingId === listing.id}
                          onClick={async () => {
                            setBusyListingId(listing.id);
                            try {
                              await onCancelListing(listing.id);
                            } finally {
                              setBusyListingId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hủy bán
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || busyListingId === listing.id}
                          onClick={async () => {
                            setBusyListingId(listing.id);
                            try {
                              await onBuyListing(listing);
                            } finally {
                              setBusyListingId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {busyListingId === listing.id ? 'Đang mua...' : 'Mua ngay'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
