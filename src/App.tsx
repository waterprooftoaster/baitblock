import "./App.css";
import { isUrlSupported } from "./scripts/url-listener";

function App() {
  isUrlSupported((supported) => {
    if (supported) {
      console.log("Youtube Live detected");
    } else {
      console.log("Not Youtube Live");
    }
  });

  return (
    <div className="w-64 h-64 bg-blue-500 flex items-center justify-center">
      <h1>Hello World</h1>
    </div>
  );
}
export default App
