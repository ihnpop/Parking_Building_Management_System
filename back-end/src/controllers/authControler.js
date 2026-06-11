export const updateRole = async (
    req,
    res
) => {

    const { id } = req.params;

    const { role } = req.body;

    const { error } =
        await supabase
            .from("profiles")
            .update({
                role
            })
            .eq("id", id);

    if (error)
        return res.status(400).json(error);

    res.json({
        message:
            "Update role success"
    });
};