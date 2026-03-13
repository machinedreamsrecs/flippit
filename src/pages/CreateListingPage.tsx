import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Plus, X, Upload, Tag, Gavel, Zap, CheckCircle, Loader2, ImageOff,
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Condition } from '../data/types';
import { calcFee, calcSellerPayout, feeLabel, FEE_RATE_HIGH_VALUE, HIGH_VALUE_THRESHOLD } from '../lib/flippit-fee';
import { formatPrice } from '../lib/utils';

const CATEGORIES = ['Electronics', 'Sneakers', 'Streetwear', 'Jewelry', 'Watches', 'Collectibles', 'Sports Cards', 'Other'];
const CONDITIONS: Condition[] = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const AUCTION_DURATIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '7 days' },
];

interface FormState {
  title: string;
  description: string;
  condition: Condition | '';
  category: string;
  images: string[];
  location: string;
  listingType: 'buy_now' | 'auction';
  price: string;
  startingBid: string;
  reservePrice: string;
  auctionDays: number;
}

const INITIAL: FormState = {
  title: '',
  description: '',
  condition: '',
  category: '',
  images: [],
  location: '',
  listingType: 'buy_now',
  price: '',
  startingBid: '',
  reservePrice: '',
  auctionDays: 7,
};

const STEPS = ['Details', 'Photos', 'Pricing', 'Review'];

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // --- Image upload via Supabase Storage ---
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 8 - form.images.length;
    const toUpload = files.slice(0, remaining);

    for (const file of toUpload) {
      const idx = form.images.length;
      setUploadingIdx(idx);
      try {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('flippit-images')
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('flippit-images')
          .getPublicUrl(path);

        setForm(prev => ({ ...prev, images: [...prev.images, publicUrl] }));
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error('Image upload failed. Try again.');
      } finally {
        setUploadingIdx(null);
      }
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function removeImage(idx: number) {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  // --- Step validation ---
  function canAdvance(): boolean {
    if (step === 0) return !!form.title.trim() && !!form.condition && !!form.category;
    if (step === 1) return true; // photos optional
    if (step === 2) {
      if (form.listingType === 'buy_now') return !!form.price && Number(form.price) > 0;
      return !!form.startingBid && Number(form.startingBid) > 0;
    }
    return true;
  }

  // --- Submit ---
  async function handleSubmit() {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {

      const endsAt = form.listingType === 'auction'
        ? new Date(Date.now() + form.auctionDays * 86_400_000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('flippit_listings')
        .insert({
          seller_id: user.id,
          seller_name: user.name,
          title: form.title.trim(),
          description: form.description.trim(),
          condition: form.condition,
          category: form.category,
          images: form.images,
          location: form.location.trim(),
          listing_type: form.listingType,
          price: form.listingType === 'buy_now' ? Number(form.price) : null,
          starting_bid: form.listingType === 'auction' ? Number(form.startingBid) : null,
          reserve_price: form.reservePrice ? Number(form.reservePrice) : null,
          ends_at: endsAt,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("It's live! Your listing is on the market. 🔥");
      navigate(`/flip/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
      setIsSubmitting(false);
    }
  }

  const displayPrice = form.listingType === 'buy_now'
    ? Number(form.price || 0)
    : Number(form.startingBid || 0);

  return (
    <div className="flex-1 bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back */}
        <button
          onClick={() => step === 0 ? navigate('/market') : setStep(s => s - 1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Back to market' : 'Back'}
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                i < step ? 'bg-indigo-600 text-white' :
                i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-indigo-600' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded transition-colors ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 sm:p-8">
          {/* ── Step 0: Details ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">What are you flipping?</h2>
                <p className="text-sm text-gray-500 mt-0.5">Tell buyers what you've got.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Nike Air Jordan 1 Retro High OG 'Chicago' — DS"
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">{form.title.length}/100</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition <span className="text-red-500">*</span></label>
                  <select
                    value={form.condition}
                    onChange={e => set('condition', e.target.value as Condition)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={4}
                  placeholder="Describe your item — condition details, included accessories, flaws, etc."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* ── Step 1: Photos ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Show it off</h2>
                <p className="text-sm text-gray-500 mt-0.5">Up to 8 photos. Great photos = faster sales.</p>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => {
                  const url = form.images[i];
                  const isUploading = uploadingIdx === i;
                  return (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50">
                      {url ? (
                        <>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-medium">
                              Cover
                            </span>
                          )}
                        </>
                      ) : isUploading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        </div>
                      ) : i === form.images.length ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-indigo-50 hover:border-indigo-300 transition-colors group"
                        >
                          <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                          <span className="text-xs text-gray-400 group-hover:text-indigo-500">{i === 0 ? 'Add photos' : 'Add'}</span>
                        </button>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload photos
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="e.g. Los Angeles, CA"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Pricing ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">How do you want to sell it?</h2>
                <p className="text-sm text-gray-500 mt-0.5">Choose a format that works for you.</p>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => set('listingType', 'buy_now')}
                  className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                    form.listingType === 'buy_now'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <Tag className={`w-6 h-6 ${form.listingType === 'buy_now' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${form.listingType === 'buy_now' ? 'text-indigo-600' : 'text-gray-600'}`}>Buy Now</span>
                  <span className="text-xs text-gray-400 text-center">Set a fixed price. Sell instantly.</span>
                </button>
                <button
                  onClick={() => set('listingType', 'auction')}
                  className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all ${
                    form.listingType === 'auction'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-amber-200'
                  }`}
                >
                  <Gavel className={`w-6 h-6 ${form.listingType === 'auction' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-semibold ${form.listingType === 'auction' ? 'text-amber-600' : 'text-gray-600'}`}>Auction</span>
                  <span className="text-xs text-gray-400 text-center">Let buyers compete. Max your price.</span>
                </button>
              </div>

              {/* Buy Now fields */}
              {form.listingType === 'buy_now' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Auction fields */}
              {form.listingType === 'auction' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting bid <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.startingBid}
                        onChange={e => set('startingBid', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Reserve price <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.reservePrice}
                        onChange={e => set('reservePrice', e.target.value)}
                        placeholder="Minimum price to sell"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Auction duration</label>
                    <div className="flex gap-2">
                      {AUCTION_DURATIONS.map(d => (
                        <button
                          key={d.value}
                          onClick={() => set('auctionDays', d.value)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            form.auctionDays === d.value
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fee preview */}
              {displayPrice > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>{form.listingType === 'auction' ? 'Starting bid' : 'Sale price'}</span>
                    <span className="font-medium">{formatPrice(displayPrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>{feeLabel(displayPrice)}</span>
                    <span>− {formatPrice(calcFee(displayPrice))}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
                    <span>You receive</span>
                    <span className="text-emerald-600">{formatPrice(calcSellerPayout(displayPrice))}</span>
                  </div>
                  {displayPrice >= HIGH_VALUE_THRESHOLD && (
                    <p className="text-xs text-indigo-600 font-medium">
                      High-value item — reduced {(FEE_RATE_HIGH_VALUE * 100).toFixed(0)}% fee applies.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ready to go live?</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review your listing before it hits the market.</p>
              </div>

              {/* Preview card */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                {form.images[0] && (
                  <img src={form.images[0]} alt={form.title} className="w-full aspect-video object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {form.listingType === 'buy_now' ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                        <Tag className="w-3 h-3" /> Buy Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                        <Gavel className="w-3 h-3" /> Auction · {form.auctionDays}d
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{form.condition}</span>
                    <span className="text-xs text-gray-500">· {form.category}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{form.title}</h3>
                  {form.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{form.description}</p>
                  )}
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(displayPrice)}
                    {form.listingType === 'auction' && <span className="text-sm font-normal text-gray-400"> starting bid</span>}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Photos</span>
                  <span className="text-gray-900 font-medium">{form.images.length} photo{form.images.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Location</span>
                  <span className="text-gray-900 font-medium">{form.location || '—'}</span>
                </div>
                {displayPrice > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {form.listingType === 'buy_now' ? 'Sale price' : 'Starting bid'}
                      </span>
                      <span className="text-gray-900 font-medium">{formatPrice(displayPrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">{feeLabel(displayPrice)}</span>
                      <span className="text-gray-900 font-medium">− {formatPrice(calcFee(displayPrice))}</span>
                    </div>
                    <div className="flex justify-between py-2 font-semibold">
                      <span className="text-gray-700">You receive</span>
                      <span className="text-emerald-600">{formatPrice(calcSellerPayout(displayPrice))}</span>
                    </div>
                  </>
                )}
              </div>

              {/* THE FLIPPIT BUTTON */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-60 flex items-center justify-center gap-3 group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Going live…
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 group-hover:animate-pulse" />
                    Flippit
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                By listing you agree that the {feeLabel(displayPrice)} applies on sale.
              </p>
            </div>
          )}
        </div>

        {/* Nav footer */}
        {step < 3 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => step === 0 ? navigate('/market') : setStep(s => s - 1)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {step === 2 ? 'Review listing' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
