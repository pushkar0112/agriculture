import { useState } from "react";

import { apiFetch } from "../api";

export default function DiseaseDetection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setError("");
  };

  const handlePredict = async () => {
    if (!file) {
      setError("Please select a plant image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await apiFetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#f4f1e8] p-6 md:p-10">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-green-700">
            AI Plant Health
          </p>

          <h1 className="text-4xl font-bold text-[#173b2b]">
            Disease Detection
          </h1>

          <p className="mt-2 text-gray-600">
            Upload a plant image and let AgroVision AI identify possible
            diseases.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Upload card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-[#173b2b]">
              Upload Plant Image
            </h2>

            {!preview ? (
              <label
                htmlFor="plant-image"
                className="flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-green-200 bg-[#f7f8f1] p-8 text-center transition hover:border-green-500 hover:bg-green-50"
              >
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#dce9b5] text-4xl">
                  🌿
                </div>

                <h3 className="text-lg font-bold text-[#173b2b]">
                  Upload your plant image
                </h3>

                <p className="mt-2 max-w-sm text-sm text-gray-500">
                  Select a clear image of the affected leaf or plant.
                </p>

                <span className="mt-6 rounded-xl bg-[#173b2b] px-6 py-3 text-sm font-semibold text-white">
                  Choose Image
                </span>

                <input
                  id="plant-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div>

                <div className="overflow-hidden rounded-2xl bg-[#f7f8f1]">
                  <img
                    src={preview}
                    alt="Plant preview"
                    className="h-[380px] w-full object-contain"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#173b2b]">
                      {file?.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {(file?.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <button
                    onClick={handleRemove}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-[#173b2b] px-6 py-4 font-semibold text-white transition hover:bg-[#24543e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Analyzing Plant..." : "Analyze Plant"}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Result card */}
          <div className="rounded-3xl bg-[#173b2b] p-6 text-white shadow-sm">

            <p className="text-sm font-semibold uppercase tracking-wider text-[#c9df7a]">
              Diagnosis
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Analysis Result
            </h2>

            {!result ? (
              <div className="flex min-h-[380px] flex-col items-center justify-center text-center">

                <div className="mb-5 text-6xl opacity-70">
                  🔬
                </div>

                <h3 className="text-lg font-semibold">
                  Waiting for an image
                </h3>

                <p className="mt-2 max-w-sm text-sm text-green-100/70">
                  Upload a plant image and click Analyze Plant to see the
                  AI-powered diagnosis.
                </p>
              </div>
            ) : (
              <div className="mt-8">

                {/* Disease */}
                <div className="rounded-2xl bg-white/10 p-6">

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-sm text-green-100/70">
                        Plant
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {result.plant}
                      </h3>
                    </div>

                    <div className="rounded-full bg-[#c9df7a] px-4 py-2 text-sm font-bold text-[#173b2b]">
                      {result.is_healthy ? "Healthy" : "Disease Detected"}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-green-100/70">
                      Diagnosis
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {result.disease}
                    </p>
                  </div>

                </div>

                {/* Confidence */}
                <div className="mt-5 rounded-2xl bg-white/10 p-6">

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-100/70">
                      Model Confidence
                    </span>

                    <span className="text-2xl font-bold text-[#c9df7a]">
                      {Number(result.confidence).toFixed(2)}%
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#c9df7a]"
                      style={{
                        width: `${Math.min(
                          Number(result.confidence),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                </div>

                {/* Next phase */}
                <div className="mt-5 rounded-2xl border border-white/10 p-5">

                  <p className="font-semibold">
                    🌱 Agricultural Information
                  </p>

                  <p className="mt-2 text-sm text-green-100/70">
                    Location-based treatment, weather conditions, prevention,
                    and agricultural resources will appear here after we
                    connect SerpApi.
                  </p>

                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}