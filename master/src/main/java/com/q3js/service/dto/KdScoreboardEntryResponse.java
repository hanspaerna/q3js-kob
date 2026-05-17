package com.q3js.service.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class KdScoreboardEntryResponse {

    @NotNull
    private String playerName;

    @NotNull
    private Integer kills;

    @NotNull
    private Integer deaths;

    private Double killDeathRatio;

    private String lastOnline;
}
