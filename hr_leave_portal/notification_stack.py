from aws_cdk import (
    CfnOutput,
    Stack,
    aws_sns as sns,
    aws_sns_subscriptions as sns_subscriptions)
from constructs import Construct

# TODO: change this to your own email address
HR_EMAIL_ADDRESS = "ysulail@gmail.com"


class NotificationStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        hr_email_topic = sns.Topic(self, "HrEmailTopic")

        hr_email_topic.add_subscription(
            sns_subscriptions.EmailSubscription(HR_EMAIL_ADDRESS)
        )

        self.hr_email_topic = hr_email_topic

        CfnOutput(self, "HrEmailTopicArn", value=hr_email_topic.topic_arn)