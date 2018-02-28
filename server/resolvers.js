function markers(parent, args, context, info) {
    const {filter, first, skip} = args;
    const where = filter
        ? { OR: [{ user_id_contains: filter }, { time_contains: filter }] }
        : {}

    return context.db.query.links({first, skip, where}, info)
}
