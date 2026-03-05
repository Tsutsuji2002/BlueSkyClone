FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER root
RUN apt-get update && apt-get install -y --no-install-recommends libicu72 && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["BSkyClone.csproj", "./"]
RUN dotnet restore "BSkyClone.csproj"
COPY . .
WORKDIR "/src/"
RUN dotnet build "./BSkyClone.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./BSkyClone.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Create uploads directories and set permissions for the app user
USER root
RUN mkdir -p wwwroot/uploads/posts wwwroot/uploads/avatars wwwroot/uploads/covers \
    && chown -R $APP_UID:$APP_UID wwwroot/uploads \
    && chmod -R 775 wwwroot/uploads
USER $APP_UID

ENTRYPOINT ["dotnet", "BSkyClone.dll"]
