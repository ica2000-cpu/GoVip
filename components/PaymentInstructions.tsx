import { useState } from 'react';
import { Copy, Check, CreditCard, AlertTriangle, Download } from 'lucide-react';
import { COUNTRIES } from '@/lib/constants';

interface PaymentInstructionsProps {
  paymentSettings: {
    cbu?: string;
    alias?: string;
    account_number?: string;
    payment_data?: any;
    whatsapp_number?: string;
  };
  reservationCode: string;
  paymentReference: string;
  totalAmount?: number;
  eventName?: string;
  onCopy?: () => void;
}

export default function PaymentInstructions({ 
  paymentSettings, 
  reservationCode, 
  paymentReference,
  totalAmount,
  eventName
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const countryCode = paymentSettings.payment_data?.country || 'AR';
  const country = COUNTRIES.find(c => c.code === countryCode);
  const data = paymentSettings.payment_data || {};

  // Helper to render a copyable field row
  const RenderField = ({ label, value, id }: { label: string, value: string, id: string }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col mb-4 group">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5 ml-1">{label}</span>
        <div 
          onClick={() => handleCopy(value, id)}
          className="flex items-center justify-between gap-3 bg-[#0a0a0a] p-3 rounded-lg border border-gray-800 hover:border-gray-600 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
        >
           <span className="font-mono text-lg md:text-xl font-bold text-white tracking-wide truncate">{value}</span>
           <div className={`p-2 rounded-md transition-all ${copiedField === id ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700 group-hover:text-white'}`}>
             {copiedField === id ? <Check size={16} /> : <Copy size={16} />}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[500px] mx-auto bg-[#0a0a0a] rounded-xl overflow-hidden border border-gray-800 shadow-lg relative">
      {/* Header / Top Pass Section */}
      <div className="bg-gradient-to-br from-blue-900/40 to-black p-6 border-b border-gray-800 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        
        <div className="flex justify-between items-start mb-6">
            <div>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                    Pase de Acceso
                </span>
                <h3 className="text-white font-bold text-xl leading-tight mt-1">Ticket de Pago</h3>
            </div>
            <div className="text-right">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Total a Pagar</span>
                {totalAmount && (
                    <span className="text-2xl font-black text-white tracking-tight">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalAmount)}
                    </span>
                )}
            </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/5 flex items-center justify-between gap-4">
             <div>
                 <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Referencia de Pago</p>
                 <p className="text-2xl font-mono font-black text-white tracking-widest text-shadow-glow">{paymentReference}</p>
             </div>
             <button 
                onClick={() => handleCopy(paymentReference, 'ref')}
                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
             >
                {copiedField === 'ref' ? <Check size={20} /> : <Copy size={20} />}
             </button>
        </div>
        <p className="text-[10px] text-blue-300/80 mt-2 text-center font-medium">
            * Usa este código como motivo/concepto de la transferencia.
        </p>
      </div>

      {/* Body / Instructions */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                {country?.flag || '🏦'}
            </div>
            <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Datos Bancarios</p>
                <p className="text-sm text-white font-medium">{country?.name || 'Internacional'}</p>
            </div>
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-1">
            {/* Argentina */}
            {countryCode === 'AR' && (
                <>
                    <RenderField label="CBU / CVU" value={data.cbu || paymentSettings.cbu} id="cbu" />
                    <RenderField label="Alias" value={data.alias || paymentSettings.alias} id="alias" />
                </>
            )}

            {/* España */}
            {countryCode === 'ES' && (
                <>
                    <RenderField label="IBAN" value={data.iban} id="iban" />
                    <RenderField label="BIC / SWIFT" value={data.bic} id="bic" />
                </>
            )}

            {/* México */}
            {countryCode === 'MX' && (
                <RenderField label="CLABE Interbancaria" value={data.clabe} id="clabe" />
            )}

            {/* Colombia */}
            {countryCode === 'CO' && (
                <>
                    <RenderField label="Número de Cuenta" value={data.account_number} id="acc_num" />
                    <RenderField label="Tipo de Cuenta" value={data.account_type} id="acc_type" />
                </>
            )}

            {/* Generic / International */}
            {!['AR', 'ES', 'MX', 'CO'].includes(countryCode) && (
                <>
                    <RenderField label="Banco" value={data.bank_name} id="bank" />
                    <RenderField label="Cuenta / IBAN" value={data.account_number || paymentSettings.account_number} id="acc_num_int" />
                    <RenderField label="SWIFT / BIC" value={data.swift} id="swift" />
                </>
            )}

            {/* Holder Name (Always shown if available) */}
            <div className="pt-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold text-center">Titular de la Cuenta</p>
                <p className="text-center text-white font-medium mt-0.5">{paymentSettings.account_number || data.account_number || 'GoVip Commerce'}</p>
            </div>
        </div>

        {/* Action Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50 flex gap-3 mb-6">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div className="text-xs text-gray-400 leading-relaxed">
                    <strong className="text-white block mb-0.5">Importante</strong>
                    Envía el comprobante por WhatsApp indicando tu número de reserva: <span className="text-white font-mono font-bold">{reservationCode}</span>
                </div>
            </div>

            {paymentSettings.whatsapp_number ? (
                <button 
                    onClick={() => {
                        const message = `Hola! Adjunto el comprobante de mi reserva ${reservationCode} para el evento ${eventName || 'GoVip'}.`;
                        const url = `https://wa.me/${paymentSettings.whatsapp_number}?text=${encodeURIComponent(message)}`;
                        window.open(url, '_blank');
                    }}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <Download size={20} />
                    Enviar Comprobante (WhatsApp)
                </button>
            ) : (
                <div className="text-center p-4 bg-yellow-900/20 rounded-xl border border-yellow-700/30">
                    <p className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">
                        ⚠️ Configuración Pendiente
                    </p>
                    <p className="text-gray-400 text-xs">
                        El comercio aún no ha configurado su WhatsApp.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
