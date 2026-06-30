import Card from "./common/Card";

function Notification({ message }) {
  return (
    <Card>
      <p>🔔 {message}</p>
    </Card>
  );
}

export default Notification;
