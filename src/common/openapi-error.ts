export const httpErrorSchema = {
  type: "object" as const,
  required: ["statusCode", "message", "error"],
  properties: {
    statusCode: { type: "integer" as const },
    message: {
      oneOf: [
        { type: "string" as const },
        { type: "array" as const, items: { type: "string" as const } },
      ],
    },
    error: { type: "string" as const },
  },
};
