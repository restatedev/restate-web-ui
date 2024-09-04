import { Button } from '@restate/ui/button';

export function RestateServer({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button className="w-full h-full focus:outline-none bg-transparent group hover:bg-transparent pressed:bg-transparent shadow-none py-0 px-0 border-none hover:scale-105 pressed:scale-95 pressed:drop-shadow-md">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-dull -h-full group-hover: drop-shadow-xl shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0ZM43.6831 47.9347C43.238 48.6013 43 49.3889 43 50.195V73.0429C43 73.8188 43.86 74.2711 44.4811 73.8219L46.7463 72.1839C47.3731 71.7306 47.7455 70.9963 47.7455 70.2134V53.2027C47.7455 52.7307 48.2679 52.4546 48.6468 52.7265L58.6944 59.9365C59.0214 60.1711 59.0169 60.6664 58.6857 60.895L55.473 63.1117C54.3788 63.8667 54.1068 65.3898 54.8699 66.489C55.6175 67.5658 57.0775 67.8278 58.1415 67.076L63.0318 63.6206C64.0796 62.8803 64.7046 61.6639 64.7046 60.3651C64.7046 59.0915 64.1035 57.8956 63.0892 57.1509L48.6051 46.5165C47.0324 45.5379 44.9824 45.9886 43.946 47.5408L43.6831 47.9347ZM58.7713 47.0291C58.019 48.1128 58.2649 49.6116 59.3223 50.3872L72.1304 59.7826C72.4408 60.0103 72.4485 60.4781 72.1458 60.7163L61.4445 69.1358C60.4247 69.9382 60.2184 71.422 60.9793 72.4811C61.7666 73.5769 63.2846 73.799 64.3429 72.9733L76.3875 63.5753C77.404 62.7822 78 61.5524 78 60.2483C78 58.8988 77.362 57.6318 76.2859 56.8444L62.0949 46.4613C61.0244 45.6781 59.5324 45.9329 58.7713 47.0291Z"
            fill="white"
            fillOpacity="0.9"
            id="test"
          />
        </svg>
      </Button>
    </div>
  );
}
