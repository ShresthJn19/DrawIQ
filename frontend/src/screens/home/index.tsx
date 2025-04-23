import { ColorSwatch, Group, Slider } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Draggable from "react-draggable";
import { SWATCHES } from "@/constants";

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [pencilThickness, setPencilThickness] = useState(3);
  const [eraserSize, setEraserSize] = useState(10);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
        ctx.lineWidth = pencilThickness;
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = isErasing ? eraserSize : pencilThickness;
        ctx.globalCompositeOperation = isErasing
          ? "destination-out"
          : "source-over";
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = isErasing ? eraserSize : pencilThickness;
        ctx.globalCompositeOperation = isErasing
          ? "destination-out"
          : "source-over";
        ctx.strokeStyle = isErasing ? "transparent" : color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      try {
        // Clear previous results
        setLatexExpression([]);

        // Get canvas data and make API call
        const response = await axios.post(
          import.meta.env.VITE_API_URL + "/calculate",
          {
            image: canvas.toDataURL("image/png"),
            dict_of_vars: dictOfVars,
          }
        );

        const resp = await response.data;
        console.log("Response", resp);

        // Update variable dictionary if needed
        const updatedVars = { ...dictOfVars };
        resp.data.forEach((data: Response) => {
          if (data.assign) {
            updatedVars[data.expr] = data.result;
          }
        });
        setDictOfVars(updatedVars);

        // Find canvas drawing boundaries
        const ctx = canvas.getContext("2d");
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width,
          minY = canvas.height,
          maxX = 0,
          maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (imageData.data[i + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        setLatexPosition({ x: centerX, y: centerY });

        // Process and display results
        if (resp.data && resp.data.length > 0) {
          const allResults = resp.data.map((data: Response) => ({
            expression: data.expr,
            answer: data.result,
          }));

          allResults.forEach((result: GeneratedResult) => {
            const latex = `\\(\\LARGE{${result.expression} = ${result.answer}}\\)`;
            setLatexExpression((prev) => [...prev, latex]);
          });

          // Force MathJax rendering after a short delay
          setTimeout(() => {
            if (window.MathJax) {
              window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }
          }, 100);
        }

        // Add this at the end of your function:
        setTimeout(() => {
          if (window.MathJax) {
            try {
              window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
              console.log("MathJax processing triggered");
            } catch (e) {
              console.error("MathJax processing error:", e);
            }
          } else {
            console.error("MathJax not loaded");
          }
        }, 300);
      } catch (err) {
        console.error("Error processing calculation:", err);
      }
    }
  };

  console.log("Current latex expressions:", latexExpression);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          title="reset the canvas"
          onClick={() => setReset(true)}
          className="z-20 bg-red-500 hover:bg-red-500 transition-opacity duration-200 text-white"
          variant="default"
          color="red"
        >
          Reset
        </Button>
        <Group className="z-20">
          {SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch}
              color={swatch}
              onClick={() => setColor(swatch)}
            />
          ))}
        </Group>
        <Button
          title="calculate"
          onClick={runRoute}
          className="z-20 bg-green-400 hover:bg-green-300 transition-opacity duration-200 text-white"
          variant="default"
          color="green"
        >
          Calculate
        </Button>
      </div>
      
      {latexExpression.length > 0 && (
        <div className="absolute top-20 right-10 z-30 bg-black/80 p-4 rounded-lg w-80 max-h-[50vh] overflow-y-auto">
          <h2 className="text-white font-bold mb-2 text-lg">Results:</h2>
          {latexExpression.map((latex, idx) => (
            <div key={idx} className="bg-gray-800 mb-2 p-2 rounded text-white">
              <div className="latex-content">{latex}</div>
            </div>
          ))}
        </div>
      )}
      
      <div className="absolute bottom-40 right-10 z-40 bg-red-800 p-4 text-white">
        <h3>Debug:</h3>
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(latexExpression, null, 2)}
        </pre>
      </div>
      
      <div className="absolute bottom-10 left-10 z-20 w-60">
        <Slider
          label={
            isErasing
              ? `Eraser size: ${eraserSize}px`
              : `Pencil thickness: ${pencilThickness}px`
          }
          value={isErasing ? eraserSize : pencilThickness}
          onChange={isErasing ? setEraserSize : setPencilThickness}
          min={isErasing ? 5 : 1}
          max={isErasing ? 30 : 10}
        />
      </div>
      <div className="absolute bottom-16 left-10 z-20">
        <Button
          title="pencil-or-eraser"
          onClick={() => setIsErasing(!isErasing)}
          className={`z-10 ${
            isErasing ? "bg-gray-500" : "bg-blue-500"
          } hover:bg-blue-400 text-white`}
        >
          {isErasing ? "Eraser Mode" : "Pencil Mode"}
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      
      {/* Keep the draggable elements for more interactive use */}
      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={{
              x: latexPosition.x,
              y: latexPosition.y + index * 40
            }}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div
              className="absolute p-2 text-white bg-black/70 rounded shadow-md"
              style={{ cursor: "pointer" }}
            >
              <div className="latex-content">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}