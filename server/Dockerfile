FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw

COPY src/ src/

# O Maven resolve apenas as dependências e os plugins necessários para esta compilação.
# O cache persistente evita novos downloads nas próximas compilações.
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -DskipTests -B


FROM eclipse-temurin:25-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java"]
CMD ["-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
