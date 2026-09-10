import BrandLogo from "@/components/BrandLogo";

export default function Avatar() {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo className="h-11 w-11 sm:h-12 sm:w-12" />

      <div>
        <h2 className="font-bold text-lg">
          M-Agent
        </h2>

        <p className="text-sm text-gray-400">
          Online
        </p>
      </div>
    </div>
  );
}
