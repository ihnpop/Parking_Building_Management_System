import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import axios from "axios";
import supabase from "./src/config/supabaseClient.js";

import cardRouter from "./src/routes/cardRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import parkingRouter from "./src/routes/parkingRoutes.js";
import registrationRouter from "./src/routes/parkingRegistrationRoutes.js";
import gateRouter from "./src/routes/gateRoutes.js";
import monthCardRouter from "./src/routes/monthCardRoutes.js";

const app = express();

app.set('trust proxy', true);   //thêm chỗ này*************************

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/api/cards", cardRouter);
app.use("/api/users", userRouter);
app.use("/api/parking", parkingRouter);
app.use("/api/parking", registrationRouter);
app.use("/api/gate", gateRouter);
app.use("/api/month-card", monthCardRouter);

// Helpers for login logs
const parseUserAgent = (uaString) => {
  if (!uaString) return "Unknown Device";
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (uaString.includes("Firefox")) browser = "Firefox";
  else if (uaString.includes("Chrome")) browser = "Chrome";
  else if (uaString.includes("Safari")) browser = "Safari";
  else if (uaString.includes("Edge")) browser = "Edge";

  if (uaString.includes("Windows")) os = "Windows";
  else if (uaString.includes("Macintosh") || uaString.includes("Mac OS")) os = "macOS";
  else if (uaString.includes("Linux")) os = "Linux";
  else if (uaString.includes("Android")) os = "Android";
  else if (uaString.includes("iPhone")) os = "iOS";

  return `${browser} - ${os}`;
};

const getIPLocation = async (ip) => {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "Hà Nội, Việt Nam";
  }
  try {
    const res = await axios.get(`https://ip-api.com/json/${ip}`);     //đổi http thành https đổi chổ này*****************88
    if (res.data && res.data.status === 'success') {
      return `${res.data.city}, ${res.data.country}`;
    }
  } catch (err) {
    console.error("Location lookup error:", err.message);
  }
  return "Hà Nội, Việt Nam";
};

const getConsecutiveFailures = async (email) => {
  const { data: logs, error } = await supabase
    .from('login_logs')
    .select('status')
    .eq('username', email)
    .order('login_time', { ascending: false })
    .limit(5);

  if (error || !logs) return 0;
  let count = 0;
  for (const log of logs) {
    if (log.status === 'Thành công') {
      break;
    }
    if (log.status === 'Thất bại' || log.status === 'Tài khoản bị khóa') {
      count++;
    }
  }
  return count;
};

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // 1. Check if user profile exists
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      // If profile does not exist, return failure immediately and DO NOT write to log
      if (profileErr || !profile) {
        return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không chính xác" });
      }

      const profilesId = profile.id;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
      const ua = req.headers['user-agent'] || '';
      const deviceBrowser = parseUserAgent(ua);
      const location = await getIPLocation(ip);

      // 2. Perform Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Determine consecutive failures
        const consecutiveFailures = await getConsecutiveFailures(email);
        const status = (consecutiveFailures + 1) > 3 ? 'Tài khoản bị khóa' : 'Thất bại';

        // Save log
        await supabase.from('login_logs').insert({
          profiles_id: profilesId,
          username: email,
          ip_address: ip,
          device_browser: deviceBrowser,
          location,
          status,
          login_time: new Date().toISOString()
        });

        return res.status(401).json({ message: error.message });
      }

      // 3. Login success
      await supabase.from('login_logs').insert({
        profiles_id: profilesId,
        username: email,
        ip_address: ip,
        device_browser: deviceBrowser,
        location,
        status: 'Thành công',
        login_time: new Date().toISOString()
      });

      res.json(data);
    }
    catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


const PORT = process.env.PORT;
app.listen(
  PORT,
  () => {
    console.log(`Server running at ${PORT}`)
  }
);