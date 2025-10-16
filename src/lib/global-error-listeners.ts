if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("window.onerror", event.error || event.message || event);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("unhandledrejection", event.reason);
  });
}
