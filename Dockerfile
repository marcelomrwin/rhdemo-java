FROM fabric8/java-alpine-openjdk8-jdk:1.5.1

ENV JAVA_APP_JAR rhdemo-swarm.jar
ENV AB_ENABLED off
ENV JAVA_OPTIONS="-Djava.net.preferIPv4Stack=true -Djava.net.preferIPv4Addresses=true -Xmx512m"

EXPOSE 8080

ADD target/rhdemo-swarm.jar /deployments/
