import express from "express";

import cors from "cors";

import supabase from "./src/config/supabaseClient.js"

import cardRouter from "./src/routes/cardRoutes.js"
import userRouter from "./src/routes/userRoutes.js"
import parkingRouter from "./src/routes/parkingRoutes.js"
import registrationRouter from "./src/routes/parkingRegistrationRoutes.js"
import gateRouter from "./src/routes/gateRoutes.js"
import monthCardRouter from "./src/routes/monthCardRoutes.js"

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use("/api/cards", cardRouter);
app.use("/api/users", userRouter);
app.use("/api/parking", parkingRouter);
app.use("/api/parking", registrationRouter);
app.use("/api/gate", gateRouter);
app.use("/api/month-card", monthCardRouter);


app.post(

    "/api/login",

    async (req, res) => {

        try {

            const {

                email,

                password

            }

                =

                req.body;

            const {

                data,

                error

            }

                =

                await supabase.auth
                    .signInWithPassword({

                        email,

                        password

                    });

            if (error) {

                return res
                    .status(401)
                    .json({

                        message:

                            error.message

                    });

            }

            res.json(data);

        }

        catch (err) {

            res
                .status(500)
                .json({

                    message:

                        err.message

                });

        }

    }

);

app.listen(

    3636,

    () => {

        console.log(

            "Server running at 3636"

        )

    }

);