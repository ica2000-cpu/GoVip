import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Share2 } from 'lucide-react';

interface TicketPDFProps {
  eventName: string;
  customerName: string;
  reservationCode: string;
  quantity: number;
  ticketType: string;
  date: string;
  location: string;
  commerceName?: string;
  commerceLogo?: string;
  totalAmount?: number;
}

export default function TicketPDF({
  eventName,
  customerName,
  reservationCode,
  quantity,
  ticketType,
  date,
  location,
  commerceName = 'GoVip',
  commerceLogo,
  totalAmount
}: TicketPDFProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      // Wait for QR code to render completely
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // Higher quality
        backgroundColor: '#000000',
        logging: false,
        useCORS: true // Important for external images if any
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);
      pdf.save(`Ticket-${eventName}-${reservationCode}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el ticket. Por favor intenta nuevamente.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hidden Ticket Container for Capture */}
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div 
            ref={ticketRef}
            className="w-[350px] bg-black text-white relative flex flex-col"
            style={{ 
                fontFamily: 'monospace', // Ensure monospace for receipt look
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
            }} 
        >
            {/* Top Cut/Holes */}
            <div className="h-4 bg-[#111] relative border-b border-dashed border-gray-800">
                <div className="absolute -bottom-2 left-0 w-4 h-4 bg-[#111] rounded-full"></div>
                <div className="absolute -bottom-2 right-0 w-4 h-4 bg-[#111] rounded-full"></div>
            </div>

            {/* Header */}
            <div className="bg-[#111] p-6 text-center border-b border-dashed border-gray-800 flex flex-col items-center">
                {commerceLogo ? (
                    <img src={commerceLogo} alt={commerceName} className="h-12 object-contain mb-2 filter brightness-0 invert" />
                ) : (
                    <h3 className="text-xl font-black uppercase tracking-widest mb-1">{commerceName}</h3>
                )}
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Comprobante de Reserva</p>
            </div>

            {/* Event Details */}
            <div className="bg-[#111] p-6 relative">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold leading-tight mb-2 text-white">{eventName}</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                        {new Date(date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs text-gray-500">{location}</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-xs text-gray-500 uppercase">Titular</span>
                        <span className="text-sm font-bold truncate max-w-[180px]">{customerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-xs text-gray-500 uppercase">Entrada</span>
                        <span className="text-sm font-bold">{ticketType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-xs text-gray-500 uppercase">Cantidad</span>
                        <span className="text-sm font-bold">x {quantity}</span>
                    </div>
                    {totalAmount && (
                        <div className="flex justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs text-gray-500 uppercase">Total</span>
                            <span className="text-sm font-bold text-green-400">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(totalAmount)}
                            </span>
                        </div>
                    )}
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center justify-center py-4 bg-white rounded-lg mb-4">
                    <QRCodeSVG 
                        value={`govip://validate/${reservationCode}`} 
                        size={150}
                        level="H"
                        includeMargin={false}
                    />
                    <p className="text-black font-mono font-bold text-lg mt-2 tracking-widest">{reservationCode}</p>
                </div>

                <div className="text-center">
                    <span className="inline-block bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded border border-yellow-500/30 uppercase tracking-wide">
                        PAGO EN REVISIÓN
                    </span>
                    <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                        Presenta este código en la entrada. <br/>
                        Sujeto a disponibilidad y admisión.
                    </p>
                </div>
            </div>

            {/* Bottom Cut/Holes */}
            <div className="h-4 bg-[#111] relative border-t border-dashed border-gray-800">
                <div className="absolute -top-2 left-0 w-4 h-4 bg-[#111] rounded-full"></div>
                <div className="absolute -top-2 right-0 w-4 h-4 bg-[#111] rounded-full"></div>
            </div>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.95] flex items-center justify-center gap-2 mt-4"
      >
        <Download size={20} />
        Descargar Ticket PDF
      </button>
    </div>
  );
}
