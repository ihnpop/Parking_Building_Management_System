import express from "express";

const router = express.Router();




router.get(
    "/cards",
    authenticate,
    authorize(
        "ADMIN",
        "MANAGER",
        "STAFF"
    ),
    getCards
);

router.post(
    "/cards",
    authenticate,
    authorize(
        "ADMIN",
        "MANAGER"
    ),
    createCard
);

router.delete(
    "/users/:id",
    authenticate,
    authorize(
        "ADMIN"
    ),
    deleteUser
);

export default router;
