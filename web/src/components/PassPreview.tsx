import type { PassField, PassStyle } from "../types";

interface PassPreviewProps {
  style: PassStyle;
  organizationName: string;
  description: string;
  logoText: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  headerFields: PassField[];
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  qrDataUrl?: string;
}

function FieldBlock({ field, color, labelColor }: { field: PassField; color: string; labelColor: string }) {
  if (!field.value) return null;
  return (
    <div className="flex flex-col min-w-0">
      {field.label && (
        <span className="text-[10px] uppercase tracking-wide truncate" style={{ color: labelColor }}>
          {field.label}
        </span>
      )}
      <span className="text-sm font-semibold truncate" style={{ color }}>
        {field.value}
      </span>
    </div>
  );
}

export function PassPreview({
  organizationName,
  description,
  logoText,
  backgroundColor,
  foregroundColor,
  labelColor,
  headerFields,
  primaryFields,
  secondaryFields,
  auxiliaryFields,
  qrDataUrl,
}: PassPreviewProps) {
  return (
    <div
      className="w-full max-w-[360px] mx-auto rounded-2xl shadow-lg overflow-hidden font-sans"
      style={{ backgroundColor, color: foregroundColor }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <span className="text-sm font-bold tracking-wide truncate">
          {logoText || organizationName || "Organization"}
        </span>
        {headerFields[0]?.value && (
          <FieldBlock field={headerFields[0]} color={foregroundColor} labelColor={labelColor} />
        )}
      </div>

      <div className="px-4 pt-4 pb-2">
        {primaryFields.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {primaryFields.map((field, i) => (
              <FieldBlock key={i} field={field} color={foregroundColor} labelColor={labelColor} />
            ))}
          </div>
        ) : (
          <span className="text-lg font-bold">{description || "Pass description"}</span>
        )}
      </div>

      {(secondaryFields.length > 0 || auxiliaryFields.length > 0) && (
        <div className="flex justify-between px-4 pb-4 gap-2">
          {[...secondaryFields, ...auxiliaryFields].map((field, i) => (
            <FieldBlock key={i} field={field} color={foregroundColor} labelColor={labelColor} />
          ))}
        </div>
      )}

      <div className="bg-white flex items-center justify-center py-4">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Pass QR code" className="w-28 h-28 sm:w-32 sm:h-32" />
        ) : (
          <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 text-center px-2">
            QR preview appears here
          </div>
        )}
      </div>
    </div>
  );
}
