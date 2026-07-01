import catDurr from "@/assets/cat-durr.png.asset.json";

export type QuotePayload = {
  text: string;
  author: string;
  handle: string;
  avatar_url?: string;
};

export function QuoteCard({ payload }: { payload: QuotePayload }) {
  const avatar = payload.avatar_url || catDurr.url;
  return (
    <div
      className="relative w-full max-w-[600px] rounded-md overflow-hidden bg-black text-white flex"
      style={{ aspectRatio: "1200 / 630", fontFamily: "system-ui, sans-serif" }}
    >
      <div
        className="w-2/5 h-full bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%), url(${avatar})`,
        }}
      />
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="text-2xl md:text-4xl font-light leading-tight break-words">
          {payload.text}
        </div>
        <div className="text-sm md:text-base italic text-white/90 mt-3">
          - {payload.author}
        </div>
        <div className="text-xs md:text-sm text-white/50">{payload.handle}</div>
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] md:text-xs text-white/50">
        Make it a Quote#6660
      </div>
    </div>
  );
}