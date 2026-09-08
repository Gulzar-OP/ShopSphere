import amqp from "amqplib";

const EXCHANGE_NAME = "shopsphere.events";

let connection = null;
let channel = null;
let connected = false;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const connectRabbitMQ = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      connection = await amqp.connect(process.env.RABBITMQ_URL);

      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "topic", {
        durable: true,
      });

      connected = true;

      console.log(`Inventory RabbitMQ connected: ${EXCHANGE_NAME}`);

      connection.on("error", (error) => {
        connected = false;

        console.error(`RabbitMQ connection error: ${error.message}`);
      });

      connection.on("close", () => {
        connected = false;
        channel = null;
        connection = null;

        console.warn("RabbitMQ connection closed");
      });

      return channel;
    } catch (error) {
      connected = false;

      console.error(
        `RabbitMQ connection attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      await wait(3000);
    }
  }

  return null;
};

export const getRabbitMQChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ channel is not available");
  }

  return channel;
};

export const isRabbitMQConnected = () => {
  return connected;
};

export const closeRabbitMQ = async () => {
  connected = false;

  if (channel) {
    await channel.close();
    channel = null;
  }

  if (connection) {
    await connection.close();
    connection = null;
  }
};

export { EXCHANGE_NAME };
