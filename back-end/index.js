import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import userRoutes from './routes/userRoutes.js';

// Cấu hình dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 3639;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', userRoutes);

// Route mặc định
app.get('/', (req, res) => {
    res.send('Node.js Supabase API đang hoạt động!');
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
    console.log(`Tài liệu API: http://localhost:${port}/api-docs`);
});

