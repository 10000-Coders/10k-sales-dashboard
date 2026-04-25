'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCopy, FaCheck, FaLink } from 'react-icons/fa';
import QRCode from 'react-qr-code';

const SCHOLARSHIP_APP_BASE =
  process.env.NEXT_PUBLIC_SCHOLARSHIP_APP_URL || 'https://scholarship.10000coders.in';
/** Modal only builds share URLs for college (scholarship) challenges. */
const SCHOLARSHIP_CHALLENGE_TYPE = 'COLLEGE_STUDENTS';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'];

function buildUrl(path, utm, baseUrl) {
  const url = new URL(path, baseUrl);
  UTM_KEYS.forEach((key) => {
    const v = utm[key];
    if (v != null && String(v).trim() !== '') url.searchParams.set(key, String(v).trim());
  });
  return url.toString();
}

/**
 * Modal to build and copy a scholarship-app test link (NEXT_PUBLIC_SCHOLARSHIP_APP_URL, UTM-aware).
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{ slug?: string, id?: number }} challenge
 */
export default function CopyChallengeLinkModal({ open, onClose, challenge }) {
  const [utm, setUtm] = useState({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
  });
  const [copied, setCopied] = useState(false);
  const testLinkQrRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setUtm({ utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '' });
    setCopied(false);
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleUtmChange = (e) => {
    const { name, value } = e.target;
    setUtm((prev) => ({ ...prev, [name]: value }));
  };

  const slug = challenge?.slug?.trim();
  const id = challenge?.id != null ? String(challenge.id) : null;

  const testPath = slug
    ? `/challenges/register/?slug=${encodeURIComponent(slug)}`
    : id
      ? `/challenges/register/?id=${encodeURIComponent(id)}`
      : '/challenges/register/';

  const testUrl = buildUrl(testPath, utm, SCHOLARSHIP_APP_BASE);

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(testUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const formatDateTime = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  };

  const handleDownloadQr = () => {
    if (!testLinkQrRef.current) return;
    const svg = testLinkQrRef.current.querySelector('svg');
    if (!svg) return;

    const title = challenge?.title?.trim() || 'Challenge';
    const startStr = formatDateTime(challenge?.challenge_start_at);
    const endStr = formatDateTime(challenge?.challenge_end_at);
    let timingLine = [startStr, endStr].filter(Boolean).join(' – ') || 'Timing not set';
    if (timingLine.length > 48) timingLine = timingLine.slice(0, 45) + '...';
    const utmLine = UTM_KEYS.map((k) => {
      const v = utm[k];
      return v != null && String(v).trim() !== '' ? `${k}=${String(v).trim()}` : null;
    }).filter(Boolean).join('  ');

    const qrSize = 200;
    const padding = 20;
    const canvasW = 320;
    let y = padding;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = padding + 60 + (utmLine ? 20 : 0) + 12 + qrSize + padding;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const titleLine = title.length > 35 ? title.slice(0, 32) + '...' : title;
    ctx.fillText(titleLine, canvasW / 2, y + 16);
    y += 28;

    ctx.fillStyle = '#4b5563';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(timingLine, canvasW / 2, y + 12);
    y += 22;

    if (utmLine) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px system-ui, sans-serif';
      const utmShort = utmLine.length > 52 ? utmLine.slice(0, 49) + '...' : utmLine;
      ctx.fillText(utmShort, canvasW / 2, y + 10);
      y += 20;
    }
    y += 12;

    const svgStr = new XMLSerializer().serializeToString(svg);
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    const img = new Image();
    const filename = `${challenge?.slug || 'challenge'}-test-link-qr.svg`;
    img.onload = () => {
      ctx.drawImage(img, (canvasW - qrSize) / 2, y, qrSize, qrSize);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace(/\.svg$/i, '.png');
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = svgDataUrl;
  };

  if (!open) return null;

  const canShareScholarshipLink =
    challenge &&
    challenge.challenge_type === SCHOLARSHIP_CHALLENGE_TYPE;

  if (challenge && !canShareScholarshipLink) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div
          className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-link-blocked-title"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <FaTimes className="text-lg" />
          </button>
          <h2 id="copy-link-blocked-title" className="text-lg font-bold text-gray-900 pr-10">
            Scholarship link not available
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Share links to the scholarship app are only generated for college-student tests. This
            challenge is not that type.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-link-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <FaTimes className="text-lg" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <FaLink className="text-[#E84975] text-xl" />
          <h2 id="copy-link-modal-title" className="text-xl font-bold text-gray-900">
            Copy test link
          </h2>
        </div>
        {challenge?.title && (
          <p className="text-sm text-gray-600 mb-4 truncate" title={challenge.title}>
            {challenge.title}
          </p>
        )}
        <p className="text-sm text-gray-500 mb-4">
          Links use the scholarship test app. Add UTM values if you need tracking, then copy.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {UTM_KEYS.map((key) => (
            <div key={key}>
              <label htmlFor={key} className="block text-xs font-medium text-gray-500 mb-1">
                {key.replace('utm_', '').replace(/_/g, ' ')}
              </label>
              <input
                id={key}
                name={key}
                type="text"
                value={utm[key]}
                onChange={handleUtmChange}
                placeholder={key === 'utm_term' ? 'e.g. suresh' : key === 'utm_source' ? 'e.g. whatsapp' : ''}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#E84975] focus:border-[#E84975]"
              />
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Test link</p>
          <div className="flex flex-col gap-3">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex-1 min-w-0 flex items-center px-3 py-2.5 bg-gray-50 text-gray-700 text-sm truncate" title={testUrl}>
                <span className="truncate">{testUrl}</span>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="shrink-0 px-4 py-2.5 bg-[#E84975] text-white text-sm font-medium hover:bg-[#E84975]/90 transition-colors flex items-center gap-2"
              >
                {copied ? <FaCheck className="text-sm" /> : <FaCopy className="text-sm" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div
                ref={testLinkQrRef}
                className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2"
              >
                <QRCode value={testUrl} size={120} />
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="text-xs font-semibold text-[#E84975] hover:text-[#E84975]/80 transition-colors"
                >
                  Download QR
                </button>
              </div>
              <div className="flex-1 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">Share this link</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Use QR on posters or screens</li>
                  <li>Share on WhatsApp or email</li>
                  <li>Track with UTM params</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Scholarship app: <code className="bg-gray-100 px-1 rounded">{SCHOLARSHIP_APP_BASE}</code>
        </p>
      </div>
    </div>
  );
}
