"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Human: any;
  }
}

export default function EnrollPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const humanRef = useRef<any>(null);

  const detectionIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const [humanLoaded, setHumanLoaded] = useState(false);

  const [modelLoading, setModelLoading] =
    useState(false);

  const [cameraStarted, setCameraStarted] =
    useState(false);

  const [faceDetected, setFaceDetected] =
    useState(false);

  const [faceMessage, setFaceMessage] =
    useState("Position your face in the camera");

  const [capturedImage, setCapturedImage] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  /*
   * Human CDN script loaded
   */
  const handleHumanLoaded = () => {
    console.log("Human library loaded");

    setHumanLoaded(true);
  };

  /*
   * Initialize Human
   */
  const initializeHuman = async () => {
    try {
      if (!window.Human) {
        setError("Human library is not available.");
        return;
      }

      setModelLoading(true);
      setError("");

      const human = new window.Human.Human({
        backend: "webgl",

        modelBasePath:
          "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",

        face: {
          enabled: true,

          detector: {
            rotation: true,
            return: true,
          },

          mesh: {
            enabled: false,
          },

          description: {
            enabled: false,
          },
        },
      });

      await human.load();

      await human.warmup();

      humanRef.current = human;

      setModelLoading(false);

      console.log(
        "Human face detection model loaded"
      );
    } catch (err) {
      console.error(
        "Human initialization error:",
        err
      );

      setModelLoading(false);

      setError(
        "Failed to load the face detection model."
      );
    }
  };

  /*
   * Detect face
   */
  const detectFace = async () => {
    if (
      !videoRef.current ||
      !cameraStarted ||
      !humanRef.current
    ) {
      return;
    }

    if (
      videoRef.current.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    try {
      const result =
        await humanRef.current.detect(
          videoRef.current
        );

      if (
        result.face &&
        result.face.length > 0
      ) {
        setFaceDetected(true);

        setFaceMessage(
          "Face detected ✓"
        );
      } else {
        setFaceDetected(false);

        setFaceMessage(
          "No face detected"
        );
      }
    } catch (err) {
      console.error(
        "Face detection error:",
        err
      );
    }
  };

  /*
   * Start camera
   */
  const startCamera = async () => {
    try {
      setError("");

      setCapturedImage(null);

      setFaceDetected(false);

      if (!humanRef.current) {
        setError(
          "Face detection model is not ready yet. Please wait a few seconds."
        );

        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setError(
          "Camera access is not supported by this browser."
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",

            width: {
              ideal: 1280,
            },

            height: {
              ideal: 720,
            },
          },

          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      setCameraStarted(true);

      setFaceMessage(
        "Looking for your face..."
      );

      /*
       * Wait for camera
       */
      setTimeout(() => {
        detectFace();
      }, 800);

      /*
       * Start detection loop
       */
      if (
        detectionIntervalRef.current
      ) {
        clearInterval(
          detectionIntervalRef.current
        );
      }

      detectionIntervalRef.current =
        setInterval(() => {
          detectFace();
        }, 700);
    } catch (err) {
      console.error(
        "Camera error:",
        err
      );

      setError(
        "Unable to access the camera. Please allow camera permission."
      );
    }
  };

  /*
   * Stop camera
   */
  const stopCamera = () => {
    if (
      detectionIntervalRef.current
    ) {
      clearInterval(
        detectionIntervalRef.current
      );

      detectionIntervalRef.current =
        null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject =
        null;
    }

    setCameraStarted(false);

    setFaceDetected(false);

    setFaceMessage(
      "Position your face in the camera"
    );
  };

  /*
   * Capture face
   */
  const captureFace = () => {
    const video = videoRef.current;

    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        "Camera is not ready yet."
      );

      return;
    }

    if (!faceDetected) {
      setError(
        "No face detected. Please position your face in front of the camera."
      );

      return;
    }

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      setError(
        "Unable to capture image."
      );

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image =
      canvas.toDataURL(
        "image/jpeg",
        0.9
      );

    setCapturedImage(image);

    setError("");

    if (
      detectionIntervalRef.current
    ) {
      clearInterval(
        detectionIntervalRef.current
      );

      detectionIntervalRef.current =
        null;
    }
  };

  /*
   * Retake
   */
  const retakePhoto = () => {
    setCapturedImage(null);

    setError("");

    setFaceDetected(false);

    setFaceMessage(
      "Looking for your face..."
    );

    if (
      cameraStarted &&
      !detectionIntervalRef.current
    ) {
      detectionIntervalRef.current =
        setInterval(() => {
          detectFace();
        }, 700);
    }
  };

  /*
   * Cleanup
   */
  useEffect(() => {
    return () => {
      if (
        detectionIntervalRef.current
      ) {
        clearInterval(
          detectionIntervalRef.current
        );
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }
    };
  }, []);

  /*
   * Initialize Human after script
   */
  useEffect(() => {
    if (humanLoaded) {
      initializeHuman();
    }
  }, [humanLoaded]);

  return (
    <>
      {/* Human browser library */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js"
        strategy="afterInteractive"
        onLoad={handleHumanLoaded}
        onError={() =>
          setError(
            "Unable to load Human face recognition library."
          )
        }
      />

      <main className="min-h-screen bg-gray-100">

        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-6 py-5">

            <h1 className="text-2xl font-bold text-gray-900">
              Face Enrollment
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Register an employee&apos;s face
              for attendance verification.
            </p>

          </div>
        </header>

        {/* Main */}
        <div className="max-w-5xl mx-auto px-6 py-8">

          <div className="bg-white rounded-xl shadow-sm p-6">

            {/* Employee */}
            <div className="mb-6">

              <h2 className="text-lg font-semibold text-gray-900">
                Employee
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-4">

                <div>
                  <p className="text-sm text-gray-500">
                    Name
                  </p>

                  <p className="font-medium">
                    David Brown
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Employee Code
                  </p>

                  <p className="font-medium">
                    EMP003
                  </p>
                </div>

              </div>

            </div>

            {/* Model Status */}
            {!humanLoaded && (
              <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-700">
                Loading face recognition library...
              </div>
            )}

            {humanLoaded &&
              modelLoading && (
                <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-700">
                  Loading face detection model...
                </div>
              )}

            {/* Camera */}
            <div className="flex flex-col items-center">

              <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden">

                {!capturedImage ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Face Status */}
                {cameraStarted &&
                  !capturedImage && (
                    <div className="absolute top-4 left-4">

                      <div
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          faceDetected
                            ? "bg-green-600 text-white"
                            : "bg-black/70 text-white"
                        }`}
                      >
                        {faceMessage}
                      </div>

                    </div>
                  )}

                {/* Face Guide */}
                {cameraStarted &&
                  !capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                      <div
                        className={`w-64 h-80 rounded-[45%] border-4 ${
                          faceDetected
                            ? "border-green-400"
                            : "border-white/60"
                        }`}
                      />

                    </div>
                  )}

              </div>

              {/* Canvas */}
              <canvas
                ref={canvasRef}
                className="hidden"
              />

              {/* Error */}
              {error && (
                <div className="w-full max-w-2xl mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-6">

                {/* Start */}
                {!cameraStarted &&
                  !capturedImage && (
                    <button
                      onClick={startCamera}
                      disabled={
                        !humanLoaded ||
                        modelLoading
                      }
                      className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {!humanLoaded ||
                      modelLoading
                        ? "Loading..."
                        : "Start Camera"}
                    </button>
                  )}

                {/* Camera active */}
                {cameraStarted &&
                  !capturedImage && (
                    <>
                      <button
                        onClick={captureFace}
                        disabled={
                          !faceDetected
                        }
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Capture Face
                      </button>

                      <button
                        onClick={stopCamera}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
                      >
                        Stop Camera
                      </button>
                    </>
                  )}

                {/* Captured */}
                {capturedImage && (
                  <>
                    <button
                      onClick={retakePhoto}
                      className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50"
                    >
                      Retake
                    </button>

                    <button
                      onClick={() => {
                        alert(
                          "Face captured successfully!"
                        );
                      }}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                    >
                      Continue
                    </button>
                  </>
                )}

              </div>

              {/* Status */}
              {cameraStarted &&
                !capturedImage && (
                  <p
                    className={`text-sm mt-4 ${
                      faceDetected
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {faceMessage}
                  </p>
                )}

              {capturedImage && (
                <p className="text-sm text-green-600 mt-4">
                  Face image captured successfully.
                </p>
              )}

            </div>

          </div>

        </div>

      </main>
    </>
  );
}